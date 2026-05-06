Write-Host "Starting backend with embedded Maven..." -ForegroundColor Green
Set-Location $PSScriptRoot
.\apache-maven-3.9.6\bin\mvn.cmd clean spring-boot:run
Read-Host "Press Enter to exit"
