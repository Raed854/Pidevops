# Jenkins Setup - MemorIA Backend

Documentation complète des étapes pour mettre en place Jenkins (et SonarQube) sur ce projet.

---

## Sommaire

1. [Prérequis](#1-prérequis)
2. [Démarrage de Jenkins en Docker](#2-démarrage-de-jenkins-en-docker)
3. [Setup initial via le navigateur](#3-setup-initial-via-le-navigateur)
4. [Création du job Pipeline](#4-création-du-job-pipeline)
5. [Le Jenkinsfile simplifié](#5-le-jenkinsfile-simplifié)
6. [Intégration SonarQube](#6-intégration-sonarqube)
7. [Erreurs rencontrées et solutions](#7-erreurs-rencontrées-et-solutions)
8. [Récap des services et ports](#8-récap-des-services-et-ports)

---

## 1. Prérequis

| Outil | Version | Rôle |
|---|---|---|
| Docker Desktop | ≥ 24.x | Hébergement de Jenkins et SonarQube |
| Git | ≥ 2.x | Push du code vers GitHub |
| GitHub repo | — | `https://github.com/Raed854/Backend_memoria1.git` |
| JDK | 17 | Build Spring Boot |
| Maven Wrapper | `./mvnw` (fourni) | Build reproductible |

> ⚠️ **Docker Desktop doit être démarré** avant toute commande `docker`.

---

## 2. Démarrage de Jenkins en Docker

### 2.1. Vérifier l'état actuel

```powershell
docker ps -a --filter "name=jenkins"
```

### 2.2. Lancer Jenkins (1ère fois)

Le port 8080 étant déjà pris par `memoria_backend_main`, Jenkins est exposé sur **8090**.

```powershell
docker run -d `
  -p 8090:8080 `
  -p 50000:50000 `
  -v jenkins_home:/var/jenkins_home `
  --name jenkins `
  jenkins/jenkins:lts
```

### 2.3. Si le conteneur existe déjà

```powershell
docker start jenkins
```

### 2.4. Vérifier que Jenkins tourne

```powershell
docker ps --filter "name=jenkins"
```

Sortie attendue :
```
NAMES     STATUS          PORTS
jenkins   Up X seconds    0.0.0.0:8090->8080/tcp, 0.0.0.0:50000->50000/tcp
```

### 2.5. Récupérer le mot de passe admin initial

```powershell
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

---

## 3. Setup initial via le navigateur

Ouvre **http://localhost:8090**

### Étape 1 — Unlock Jenkins
- Colle le mot de passe admin initial → **Continue**

### Étape 2 — Customize Jenkins
- Clique **Install suggested plugins** (~3-5 min)

### Étape 3 — Create First Admin User

| Champ | Valeur |
|---|---|
| Username | `admin` |
| Password | (à choisir) |
| Full name | `Raed` |
| E-mail | `nefziraed9@gmail.com` |

### Étape 4 — Instance Configuration
- Jenkins URL : `http://localhost:8090/`
- **Save and Finish**

### Étape 5 — Start using Jenkins

✅ Dashboard ouvert.

---

## 4. Création du job Pipeline

### 4.1. Créer le job

1. Dashboard Jenkins → **New Item** (Nouveau item)
2. Nom : `MemorIA-Backend`
3. Type : **Pipeline**
4. **OK**

### 4.2. Configurer le job

Dans la section **Pipeline** (en bas de la page de configuration) :

| Champ | Valeur |
|---|---|
| Définition | `Pipeline script from SCM` |
| SCM | `Git` |
| Repository URL | `https://github.com/Raed854/Backend_memoria1.git` |
| Credentials | `- aucun -` (repo public) |
| Branches to build | `*/main` |
| Script Path | `Jenkinsfile` |

→ **Save**

### 4.3. Lancer le 1er build

Sur la page du job → **Build Now** (Lancer un build)

---

## 5. Le Jenkinsfile simplifié

Pour un premier build qui passe, on a retiré :
- ❌ La déclaration `tools` (jdk-17, maven-3.9 — nécessitait config manuelle)
- ❌ Le stage SonarQube (à réactiver à l'étape 6)
- ❌ Le stage Quality Gate (dépend de Sonar)
- ❌ Le stage Docker Build & Push (nécessite credentials Docker Hub)

Version actuelle :

```groovy
pipeline {
    agent any

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 20, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Diagnose') {
            steps {
                sh 'java -version'
                sh 'chmod +x ./mvnw'
                sh './mvnw -v'
            }
        }

        stage('Build') {
            steps {
                sh './mvnw -B clean package -DskipTests'
            }
        }

        stage('Archive JAR') {
            steps {
                archiveArtifacts artifacts: 'target/*.jar', fingerprint: true, allowEmptyArchive: true
            }
        }
    }

    post {
        success { echo "Build #${BUILD_NUMBER} OK" }
        failure { echo "Build #${BUILD_NUMBER} en echec" }
    }
}
```

---

## 6. Intégration SonarQube

### 6.1. Démarrer SonarQube

```powershell
docker start sonarqube
```

Attendre ~1-2 min que le statut passe à **UP** :

```powershell
curl http://localhost:9000/api/system/status
```

→ Réponse attendue : `{"status":"UP"}`

### 6.2. Login SonarQube

Ouvre **http://localhost:9000**

| Champ | Valeur |
|---|---|
| Login | `admin` |
| Password | `admin` (à changer immédiatement) |

### 6.3. Générer un token Sonar

1. Avatar (en haut à droite) → **My Account**
2. Onglet **Security**
3. **Generate Tokens** :
   - Name : `jenkins-token`
   - Type : **Global Analysis Token**
   - Expires : **No expiration**
4. **Generate** → ⚠️ **copier immédiatement** le token (`squ_...`)

### 6.4. Installer le plugin SonarQube dans Jenkins

1. Jenkins → **Administrer Jenkins** → **Plugins**
2. Onglet **Available plugins**
3. Chercher `SonarQube Scanner` → cocher → **Install**

### 6.5. Configurer le serveur Sonar dans Jenkins

⚠️ **Important** : Jenkins est dans un conteneur Docker. Pour atteindre SonarQube (autre conteneur), utiliser `host.docker.internal` au lieu de `localhost`.

1. Jenkins → **Administrer Jenkins** → **System**
2. Section **SonarQube servers** → **Add SonarQube**

| Champ | Valeur |
|---|---|
| Name | `SonarQube` (le Jenkinsfile y fait référence) |
| Server URL | `http://host.docker.internal:9000` |
| Server authentication token | nouveau credential `Secret text` avec ID `sonarqube-token` |

→ **Save**

### 6.6. Réactiver les stages dans le Jenkinsfile

Ajouter après le stage Build :

```groovy
stage('SonarQube Analysis') {
    steps {
        withSonarQubeEnv('SonarQube') {
            sh './mvnw -B sonar:sonar'
        }
    }
}

stage('Quality Gate') {
    steps {
        timeout(time: 5, unit: 'MINUTES') {
            waitForQualityGate abortPipeline: true
        }
    }
}
```

### 6.7. Configuration projet Sonar

Le fichier `sonar-project.properties` (déjà présent à la racine) :

```properties
sonar.projectKey=memoria-backend
sonar.projectName=MemorIA Backend
sonar.sources=src/main/java
sonar.tests=src/test/java
sonar.java.binaries=target/classes
sonar.java.source=17
sonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml
sonar.exclusions=**/dto/**,**/config/**,**/MemorIaBackendApplication.java
sonar.sourceEncoding=UTF-8
```

---

## 7. Erreurs rencontrées et solutions

### 7.1. `failed to connect to the docker API`
**Cause** : Docker Desktop n'est pas démarré.
**Fix** : Lancer Docker Desktop manuellement et attendre que l'icône baleine soit stable.

### 7.2. `Bind for 0.0.0.0:8080 failed: port is already allocated`
**Cause** : Un autre conteneur (ex. `memoria_backend_main`) occupe le port 8080.
**Fix** : Changer le port de Jenkins → utiliser **8090**.

```powershell
docker rm jenkins
docker run -d -p 8090:8080 -p 50000:50000 -v jenkins_home:/var/jenkins_home --name jenkins jenkins/jenkins:lts
```

### 7.3. `Conflict. The container name "/jenkins" is already in use`
**Cause** : Conteneur Jenkins déjà créé.
**Fix** : Soit le démarrer (`docker start jenkins`), soit le supprimer et recréer (`docker rm jenkins`).

### 7.4. `ERR_EMPTY_RESPONSE` sur localhost:8080
**Cause** : Conteneur Jenkins en état `Created` (jamais démarré).
**Fix** : `docker start jenkins`.

### 7.5. PowerShell : `-v : Le terme «-v» n'est pas reconnu`
**Cause** : Continuation de ligne `\` est du Bash, pas PowerShell.
**Fix** : Utiliser le backtick `` ` `` ou tout mettre sur une seule ligne.

### 7.6. Build Jenkins dure 2 ms — `ERROR: No flow definition, cannot run`
**Cause** : Le job Pipeline n'a pas de définition (ni script inline, ni SCM configuré).
**Fix** : Configurer **Pipeline script from SCM** pointant vers le repo GitHub (cf. §4.2).

### 7.7. App Spring Boot — `Connect to http://localhost:8761 failed`
**Cause** : Eureka pas démarré.
**Fix** :
```powershell
docker start memoria_eureka
```
Ou désactiver Eureka temporairement dans `application.properties` :
```properties
eureka.client.register-with-eureka=false
eureka.client.fetch-registry=false
```

### 7.8. App Spring Boot — `Web server failed to start. Port 8080 was already in use`
**Cause** : `memoria_backend_main` (Docker) occupe déjà le port 8080.
**Fix** :
```powershell
docker stop memoria_backend_main
```

### 7.9. SonarQube container `Exited (255)`
**Cause** : Crash (souvent OOM ou `vm.max_map_count` trop bas).
**Fix** :
```powershell
docker start sonarqube
```
Si ça recrash, augmenter la RAM allouée à Docker Desktop (Settings → Resources → Memory ≥ 4 GB).

---

## 8. Récap des services et ports

| Service | Type | Port hôte | URL d'accès |
|---|---|---|---|
| Docker Desktop | runtime | — | — |
| **Jenkins** | conteneur | **8090** | http://localhost:8090 |
| Jenkins agents | conteneur | 50000 | (interne) |
| **SonarQube** | conteneur | **9000** | http://localhost:9000 |
| Eureka | conteneur | 8761 | http://localhost:8761 |
| MemorIA backend (local) | JVM hôte | 8080 | http://localhost:8080 |
| MemorIA backend (Docker) | conteneur | 8080 | (à arrêter pour libérer le port) |
| MySQL | hôte | 3306 | jdbc:mysql://localhost:3306 |

---

## 9. Commandes utiles

### Lifecycle Jenkins

```powershell
# Logs en direct
docker logs -f jenkins

# Redémarrer
docker restart jenkins

# Arrêter
docker stop jenkins

# Supprimer (sans toucher aux données)
docker rm jenkins

# Réinitialiser complètement (ATTENTION : efface jobs, plugins, users)
docker rm -f jenkins
docker volume rm jenkins_home
```

### Lifecycle SonarQube

```powershell
docker logs -f sonarqube
docker restart sonarqube
docker stop sonarqube
```

### Re-déclencher un build après push

```powershell
git add .
git commit -m "ton message"
git push
```

→ Sur Jenkins, cliquer **Build Now** (ou configurer un webhook GitHub pour automatiser).

---

## 10. Prochaines évolutions possibles

- [ ] Webhook GitHub → trigger auto sur push
- [ ] Stage `Test` (avec base de données de test type Testcontainers)
- [ ] Stage Docker Build & Push vers Docker Hub (credentials `dockerhub`)
- [ ] Couverture de code Jacoco affichée dans Sonar
- [ ] Notifications Slack/Email sur échec

---

**Auteur** : Raed854
**Repo** : https://github.com/Raed854/Backend_memoria1
**Date** : 2026-04-29
