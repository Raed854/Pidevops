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
