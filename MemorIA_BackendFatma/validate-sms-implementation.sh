#!/bin/bash
# Script de vérification de l'implémentation SMS Twilio
# À exécuter depuis le répertoire du backend

echo ""
echo "=========================================="
echo "SMS TWILIO - Validation de l'implémentation"
echo "=========================================="
echo ""

BACKEND_PATH="$(pwd)"

echo "[1] Vérification des fichiers créés/modifiés..."
echo ""

# Vérifier TwilioConfig.java
if [ -f "$BACKEND_PATH/src/main/java/MemorIA/config/TwilioConfig.java" ]; then
    echo "✅ TwilioConfig.java présent"
    LINES=$(wc -l < "$BACKEND_PATH/src/main/java/MemorIA/config/TwilioConfig.java")
    echo "   Lignes: $LINES"
else
    echo "❌ TwilioConfig.java MANQUANT"
fi

# Vérifier SmsService.java
if [ -f "$BACKEND_PATH/src/main/java/MemorIA/service/SmsService.java" ]; then
    echo "✅ SmsService.java présent"
    LINES=$(wc -l < "$BACKEND_PATH/src/main/java/MemorIA/service/SmsService.java")
    echo "   Lignes: $LINES"
else
    echo "❌ SmsService.java MANQUANT"
fi

echo ""
echo "[2] Vérification de l'injection dans ReminderNotificationService..."
echo ""

if grep -q "private SmsService smsService" "$BACKEND_PATH/src/main/java/MemorIA/service/ReminderNotificationService.java"; then
    echo "✅ Injection SmsService présente"
else
    echo "❌ Injection SmsService MANQUANTE"
fi

if grep -q "smsService.sendSms" "$BACKEND_PATH/src/main/java/MemorIA/service/ReminderNotificationService.java"; then
    echo "✅ Appel à smsService.sendSms() présent"
else
    echo "❌ Appel à smsService.sendSms() MANQUANT"
fi

echo ""
echo "[3] Vérification de la configuration Twilio dans application.properties..."
echo ""

if grep -q "twilio.account.sid" "$BACKEND_PATH/src/main/resources/application.properties"; then
    echo "✅ twilio.account.sid configuré"
else
    echo "❌ twilio.account.sid MANQUANT"
fi

if grep -q "twilio.auth.token" "$BACKEND_PATH/src/main/resources/application.properties"; then
    echo "✅ twilio.auth.token configuré"
else
    echo "❌ twilio.auth.token MANQUANT"
fi

if grep -q "twilio.phone.number" "$BACKEND_PATH/src/main/resources/application.properties"; then
    echo "✅ twilio.phone.number configuré"
else
    echo "❌ twilio.phone.number MANQUANT"
fi

if grep -q "sms.enabled" "$BACKEND_PATH/src/main/resources/application.properties"; then
    echo "✅ sms.enabled configuré"
else
    echo "❌ sms.enabled MANQUANT"
fi

echo ""
echo "[4] Vérification de la dépendance Twilio..."
echo ""

if grep -q '<artifactId>twilio</artifactId>' "$BACKEND_PATH/pom.xml"; then
    echo "✅ Dépendance Twilio présente dans pom.xml"
    TWILIO_VERSION=$(grep -A1 '<artifactId>twilio</artifactId>' "$BACKEND_PATH/pom.xml" | grep '<version>' | sed 's/.*<version>\(.*\)<\/version>.*/\1/')
    echo "   Version: $TWILIO_VERSION"
else
    echo "❌ Dépendance Twilio MANQUANTE"
fi

echo ""
echo "=========================================="
echo "✅ Validation terminée!"
echo "=========================================="
echo ""
echo "Prochaines étapes:"
echo "1. Compiler: mvn clean compile"
echo "2. Démarrer: mvn spring-boot:run"
echo "3. Créer un rappel avec notificationChannels: [\"SMS\"]"
echo "4. Vérifier les logs pour l'envoi SMS"
echo ""

