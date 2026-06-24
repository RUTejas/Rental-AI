pipeline {
  agent any
  stages {
    stage('Install') { steps { dir('backend') { sh 'npm ci' }; dir('frontend') { sh 'npm ci' } } }
    stage('Build') { steps { dir('backend') { sh 'npm run build' }; dir('frontend') { sh 'npm run build' } } }
    stage('Test') { steps { dir('backend') { sh 'npm test -- --passWithNoTests' } } }
    stage('Docker build') { steps { sh 'docker compose build' } }
    stage('Health check') { steps { sh 'docker compose up -d && sleep 10 && curl --fail http://localhost:5000/health' } }
  }
  post { always { sh 'docker compose down' } }
}
