# CI / CD & DevOps — MemorIA_Backend

Guide d'intégration **qualité + CI + DevOps** pour le service Spring Boot `MemorIA_Backend`.

Périmètre couvert :
1. Tests statiques avec **SonarQube**
2. Gestion des **livrables** (artefacts Maven)
3. Publication de l'image sur **Docker Hub**

---

## 1. Pré-requis

| Outil | Version conseillée | Rôle |
|-------|--------------------|------|
| JDK | 17 | Build Spring Boot |
| Maven Wrapper | `./mvnw` (fourni) | Build reproductible |
| Docker | ≥ 24.x | Build & push image |
| Jenkins / GitHub Actions / GitLab CI | — | Orchestrateur CI/CD |
| SonarQube Server | ≥ 10.x | Analyse statique |
| Compte Docker Hub | — | Registry public |

Variables / secrets à configurer dans le CI :

```
SONAR_HOST_URL       # ex: http://sonarqube:9000
SONAR_TOKEN          # token utilisateur Sonar
DOCKERHUB_USERNAME   # login Docker Hub
DOCKERHUB_TOKEN      # access token Docker Hub
```

---

## 2. Tests statiques avec SonarQube

### 2.1. Lancer un serveur Sonar local (optionnel, pour dev)

```bash
docker run -d --name sonarqube \
  -p 9000:9000 \
  sonarqube:lts-community
```

Accès : http://localhost:9000 — login initial `admin` / `admin`.
Créer un **projet manuel** → générer un **token utilisateur**.

### 2.2. Plugins Maven à ajouter dans `pom.xml`

À insérer dans la section `<build><plugins>` (à côté du `spring-boot-maven-plugin`) :

```xml
<!-- Couverture de code (alimente Sonar) -->
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.12</version>
  <executions>
    <execution>
      <goals><goal>prepare-agent</goal></goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>test</phase>
      <goals><goal>report</goal></goals>
    </execution>
  </executions>
</plugin>

<!-- Plugin Sonar -->
<plugin>
  <groupId>org.sonarsource.scanner.maven</groupId>
  <artifactId>sonar-maven-plugin</artifactId>
  <version>4.0.0.4121</version>
</plugin>
```

Et dans `<properties>` :

```xml
<sonar.projectKey>memoria-backend</sonar.projectKey>
<sonar.projectName>MemorIA Backend</sonar.projectName>
<sonar.coverage.jacoco.xmlReportPaths>
  ${project.build.directory}/site/jacoco/jacoco.xml
</sonar.coverage.jacoco.xmlReportPaths>
```

### 2.3. Commande d'analyse

```bash
./mvnw clean verify sonar:sonar \
  -Dsonar.host.url=$SONAR_HOST_URL \
  -Dsonar.login=$SONAR_TOKEN
```

### 2.4. Quality Gate (bloque le pipeline)

Dans Sonar → **Quality Gates**, activer le gate par défaut *Sonar way* (ou personnalisé). Côté CI, faire échouer le job si le gate n'est pas passé :

```bash
./mvnw sonar:sonar -Dsonar.qualitygate.wait=true
```

---

## 3. Gestion des livrables

Le livrable principal est le **JAR exécutable Spring Boot** : `target/demo-0.0.1-SNAPSHOT.jar`.

### 3.1. Build local

```bash
./mvnw clean package -DskipTests=false
```

### 3.2. Versionnement

Adopter **SemVer** : `MAJOR.MINOR.PATCH`.
- Branches `feature/*` → `0.0.1-SNAPSHOT`
- Tag Git `vX.Y.Z` → release stable `X.Y.Z`

Exemple de release Maven :

```bash
./mvnw versions:set -DnewVersion=1.0.0
./mvnw clean package
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

### 3.3. Publication des artefacts

Trois options selon l'infra disponible :

| Cible | Commande | Quand l'utiliser |
|-------|----------|------------------|
| **Nexus / Artifactory** | `./mvnw deploy` (avec `<distributionManagement>` configuré) | Entreprise, repo Maven privé |
| **GitHub Releases** | `gh release create vX.Y.Z target/*.jar` | Open-source / projet GitHub |
| **Docker Hub** | voir §4 | Déploiement conteneurisé |

### 3.4. Conservation

Le job CI doit **archiver** les livrables :

- Jenkins : `archiveArtifacts artifacts: 'target/*.jar', fingerprint: true`
- GitHub Actions : `actions/upload-artifact@v4`
- GitLab CI : `artifacts: paths: [target/*.jar]`

---

## 4. Publication sur Docker Hub

### 4.1. `Dockerfile` (à créer à la racine du projet)

```dockerfile
# --- Build stage ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# --- Run stage ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

### 4.2. Build & push manuel

```bash
docker login -u $DOCKERHUB_USERNAME -p $DOCKERHUB_TOKEN

docker build -t $DOCKERHUB_USERNAME/memoria-backend:1.0.0 .
docker tag $DOCKERHUB_USERNAME/memoria-backend:1.0.0 $DOCKERHUB_USERNAME/memoria-backend:latest

docker push $DOCKERHUB_USERNAME/memoria-backend:1.0.0
docker push $DOCKERHUB_USERNAME/memoria-backend:latest
```

### 4.3. Convention de tags

| Tag | Source | Usage |
|-----|--------|-------|
| `latest` | branche `main` | Dernier build stable |
| `X.Y.Z` | tag Git `vX.Y.Z` | Release immuable |
| `dev` | branche `develop` | Dernière version de dev |
| `sha-<git_sha>` | tout commit | Traçabilité fine |

---

## 5. Pipeline complet — exemples

### 5.1. GitHub Actions — `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD MemorIA Backend

on:
  push:
    branches: [main, develop]
    tags: ['v*.*.*']
  pull_request:
    branches: [main]

jobs:
  build-test-sonar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
          cache: maven

      - name: Build & tests + JaCoCo
        run: ./mvnw clean verify

      - name: SonarQube analysis
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
        run: ./mvnw sonar:sonar -Dsonar.qualitygate.wait=true

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: memoria-backend-jar
          path: target/*.jar

  publish-docker:
    needs: build-test-sonar
    if: startsWith(github.ref, 'refs/tags/v') || github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Compute tags
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ secrets.DOCKERHUB_USERNAME }}/memoria-backend
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

### 5.2. Jenkinsfile (déclaratif)

```groovy
pipeline {
  agent any
  tools { jdk 'jdk-17'; maven 'maven-3.9' }

  environment {
    IMAGE = "memoria-backend"
    REGISTRY = "docker.io/${env.DOCKERHUB_USERNAME}"
  }

  stages {
    stage('Checkout')  { steps { checkout scm } }

    stage('Build & Test') {
      steps { sh './mvnw clean verify' }
      post  { always { junit 'target/surefire-reports/*.xml' } }
    }

    stage('SonarQube') {
      steps {
        withSonarQubeEnv('SonarQube') {
          sh './mvnw sonar:sonar'
        }
      }
    }

    stage('Quality Gate') {
      steps { timeout(time: 5, unit: 'MINUTES') { waitForQualityGate abortPipeline: true } }
    }

    stage('Archive JAR') {
      steps { archiveArtifacts artifacts: 'target/*.jar', fingerprint: true }
    }

    stage('Docker Build & Push') {
      when { anyOf { branch 'main'; tag 'v*' } }
      steps {
        withCredentials([usernamePassword(
            credentialsId: 'dockerhub',
            usernameVariable: 'DH_USER',
            passwordVariable: 'DH_PASS')]) {
          sh '''
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
            TAG=$(git describe --tags --always)
            docker build -t $DH_USER/$IMAGE:$TAG -t $DH_USER/$IMAGE:latest .
            docker push $DH_USER/$IMAGE:$TAG
            docker push $DH_USER/$IMAGE:latest
          '''
        }
      }
    }
  }
}
```

---

## 6. Workflow recommandé

```
 ┌────────────┐   push/PR    ┌──────────────┐
 │  Dev local │ ───────────▶ │  CI (build)  │
 └────────────┘              └──────┬───────┘
                                    │ tests + JaCoCo
                                    ▼
                             ┌──────────────┐
                             │  SonarQube   │  ← Quality Gate
                             └──────┬───────┘
                                    │ ✅
                                    ▼
                             ┌──────────────┐
                             │   Artefact   │  (JAR archivé)
                             └──────┬───────┘
                                    │ tag vX.Y.Z
                                    ▼
                             ┌──────────────┐
                             │  Docker Hub  │  (image versionnée)
                             └──────────────┘
```

---

## 7. Checklist de mise en place

- [ ] Ajouter les plugins **JaCoCo** + **sonar-maven-plugin** dans `pom.xml`
- [ ] Créer le projet sur SonarQube + récupérer le token
- [ ] Créer le `Dockerfile` à la racine
- [ ] Créer un repo Docker Hub `memoria-backend`
- [ ] Configurer les secrets CI (`SONAR_*`, `DOCKERHUB_*`)
- [ ] Ajouter le pipeline (`.github/workflows/ci-cd.yml` ou `Jenkinsfile`)
- [ ] Activer la **Quality Gate** bloquante
- [ ] Tester un cycle complet : commit → build → analyse → image publiée
