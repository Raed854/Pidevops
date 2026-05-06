# Script de test SMS Twilio - MemoriA (PowerShell)
# Ce script teste l'implémentation SMS Twilio étape par étape

# Configuration
$BACKEND_URL = "http://localhost:8089"
$PATIENT_ID = 1
$PHONE_NUMBER = "+33612345678"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧪 TEST SMS TWILIO - MEMÓRIA" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 1 : Vérifier que le backend est en cours d'exécution
# ───────────────────────────────────────────────────────────────────

Write-Host "[ÉTAPE 1]" -ForegroundColor Yellow -NoNewline
Write-Host " Vérification du backend..."
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/actuator/health" -ErrorAction Stop -TimeoutSec 3
    Write-Host "✅ Backend en cours d'exécution" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible!" -ForegroundColor Red
    Write-Host "   Assurez-vous que le backend est démarré:"
    Write-Host "   mvn spring-boot:run"
    exit 1
}

Write-Host ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 2 : Vérifier que Twilio est initialisé
# ───────────────────────────────────────────────────────────────────

Write-Host "[ÉTAPE 2]" -ForegroundColor Yellow -NoNewline
Write-Host " Vérification de l'initialisation Twilio..."
Write-Host ""

Write-Host "✅ Vérification des logs:" -ForegroundColor Green
Write-Host "   Chercher le message: '✅ Twilio initialisé avec succès'"
Write-Host ""
Write-Host "   Commande PowerShell:"
Write-Host '   Get-Content logs/app.log -Tail 100 | Select-String "Twilio initialisé"'
Write-Host ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 3 : Mettre à jour le numéro de téléphone du patient
# ───────────────────────────────────────────────────────────────────

Write-Host "[ÉTAPE 3]" -ForegroundColor Yellow -NoNewline
Write-Host " Mise à jour du numéro de téléphone du patient..."
Write-Host ""

Write-Host "   Exécutez la requête SQL suivante:"
Write-Host ""
Write-Host "   UPDATE users SET telephone = '$PHONE_NUMBER' WHERE id = $PATIENT_ID;" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Via MySQL Workbench ou command line:"
Write-Host "   mysql -u root -e `"UPDATE users SET telephone = '$PHONE_NUMBER' WHERE id = $PATIENT_ID;`""
Write-Host ""

Read-Host "   Appuyez sur ENTRÉE une fois le numéro mis à jour"

Write-Host ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 4 : Créer un rappel avec SMS
# ───────────────────────────────────────────────────────────────────

Write-Host "[ÉTAPE 4]" -ForegroundColor Yellow -NoNewline
Write-Host " Création d'un rappel avec SMS..."
Write-Host ""

$now = Get-Date
$timeString = $now.ToString("HH:mm:ss")
$dateString = $now.ToString("yyyy-MM-dd")

$reminderPayload = @{
    title = "Test SMS Twilio - $timeString"
    description = "Ceci est un test de SMS via Twilio"
    type = "MEDICATION"
    reminderTime = "$timeString"
    reminderDate = "$dateString"
    notificationChannels = @("SMS")
    notifyPatient = $true
    notifyCaregiver = $false
    patientId = $PATIENT_ID
    status = "PENDING"
} | ConvertTo-Json

Write-Host "   Requête:"
Write-Host "   POST $BACKEND_URL/api/reminders"
Write-Host ""
Write-Host "   Payload:"
Write-Host ($reminderPayload | ConvertFrom-Json | ConvertTo-Json -Depth 10)
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/reminders" `
        -Method Post `
        -ContentType "application/json" `
        -Body $reminderPayload `
        -ErrorAction Stop

    $responseContent = $response.Content | ConvertFrom-Json

    Write-Host "   Réponse:"
    Write-Host ($responseContent | ConvertTo-Json -Depth 10)
    Write-Host ""

    if ($responseContent.id) {
        Write-Host "✅ Rappel créé avec succès (ID: $($responseContent.id))" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de la création du rappel!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de la création du rappel!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 5 : Attendre le scheduler
# ───────────────────────────────────────────────────────────────────

Write-Host "[ÉTAPE 5]" -ForegroundColor Yellow -NoNewline
Write-Host " Attente de l'envoi du SMS par le scheduler..."
Write-Host ""
Write-Host "   Le scheduler envoie les notifications toutes les 60 secondes."
Write-Host "   Veuillez patienter..."
Write-Host ""

for ($i = 60; $i -gt 0; $i--) {
    Write-Progress -Activity "Attente du scheduler" -Status "$i secondes restantes..." -PercentComplete (($i / 60) * 100)
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "✅ Vérification de l'envoi du SMS" -ForegroundColor Green
Write-Host ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 6 : Vérifier les logs
# ───────────────────────────────────────────────────────────────────

Write-Host "[ÉTAPE 6]" -ForegroundColor Yellow -NoNewline
Write-Host " Vérification des logs..."
Write-Host ""

Write-Host "   Les logs à rechercher:"
Write-Host ""
Write-Host "   ✅ SMS envoyé avec succès"
Write-Host '   Logs: Get-Content logs/app.log -Tail 100 | Select-String "SMS envoyé avec succès"'
Write-Host ""
Write-Host "   📲 SMS envoyé (patient)"
Write-Host '   Logs: Get-Content logs/app.log -Tail 100 | Select-String "SMS envoyé \(patient\)"'
Write-Host ""
Write-Host "   ❌ Erreur lors de l'envoi du SMS"
Write-Host '   Logs: Get-Content logs/app.log -Tail 100 | Select-String "Erreur lors de l''envoi du SMS"'
Write-Host ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 7 : Vérifier dans Twilio Dashboard
# ───────────────────────────────────────────────────────────────────

Write-Host "[ÉTAPE 7]" -ForegroundColor Yellow -NoNewline
Write-Host " Vérification dans Twilio Dashboard..."
Write-Host ""

Write-Host "   Allez à: https://www.twilio.com/console/sms/logs"
Write-Host ""
Write-Host "   Cherchez le SMS envoyé à: $PHONE_NUMBER" -ForegroundColor Yellow
Write-Host "   Message: [MemoriA] Rappel: Test SMS Twilio"
Write-Host ""

# ───────────────────────────────────────────────────────────────────
# RÉSUMÉ
# ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎯 RÉSUMÉ DU TEST" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Si vous voyez:" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Backend en cours d'exécution" -ForegroundColor Green
Write-Host "✅ Rappel créé avec succès" -ForegroundColor Green
Write-Host "✅ SMS envoyé avec succès dans les logs" -ForegroundColor Green
Write-Host "✅ SMS visible dans Twilio Dashboard" -ForegroundColor Green
Write-Host ""
Write-Host "Alors l'intégration SMS Twilio fonctionne correctement! 🎉" -ForegroundColor Green
Write-Host ""

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔗 LIENS UTILES" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📚 Documentation:"
Write-Host "   - SMS_QUICK_START.md"
Write-Host "   - SMS_TWILIO_SETUP.md"
Write-Host "   - SMS_INDEX.md"
Write-Host ""

Write-Host "🐛 Dépannage:"
Write-Host "   - Vérifier les logs: Get-Content logs/app.log -Tail 100"
Write-Host "   - Chercher 'SMS': Get-Content logs/app.log -Tail 100 | Select-String -Pattern 'SMS|sms'"
Write-Host ""

Write-Host "💬 Contact Twilio:"
Write-Host "   - Dashboard: https://www.twilio.com/console"
Write-Host "   - Support: https://support.twilio.com"
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

