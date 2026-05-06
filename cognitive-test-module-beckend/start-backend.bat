@echo off
echo Starting backend with embedded Maven...
cd /d "%~dp0"
.\apache-maven-3.9.6\bin\mvn clean spring-boot:run
pause
