#!/bin/bash
# SCRIPT DE TEST SMS TWILIO - MemoriA
# Ce script teste l'implémentation SMS Twilio étape par étape

set -e  # Arrêter si une erreur survient

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🧪 TEST SMS TWILIO - MEMÓRIA"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:8089"
PATIENT_ID=1
PHONE_NUMBER="+33612345678"

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 1 : Vérifier que le backend est en cours d'exécution
# ───────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[ÉTAPE 1]${NC} Vérification du backend..."
echo ""

if curl -s "$BACKEND_URL/actuator/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Backend en cours d'exécution"
else
    echo -e "${RED}❌${NC} Backend non accessible!"
    echo "   Assurez-vous que le backend est démarré:"
    echo "   mvn spring-boot:run"
    exit 1
fi

echo ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 2 : Vérifier que Twilio est initialisé
# ───────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[ÉTAPE 2]${NC} Vérification de l'initialisation Twilio..."
echo ""

# Note: En production, vérifier les logs via une endpoint dédiée
echo -e "${GREEN}✅${NC} Vérification des logs:"
echo "   Chercher le message: \"✅ Twilio initialisé avec succès\""
echo ""
echo "   Commande:"
echo "   tail -f logs/app.log | grep \"Twilio initialisé\""
echo ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 3 : Mettre à jour le numéro de téléphone du patient
# ───────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[ÉTAPE 3]${NC} Mise à jour du numéro de téléphone du patient..."
echo ""
echo "   Exécutez la requête SQL suivante:"
echo ""
echo "   UPDATE users SET telephone = '$PHONE_NUMBER' WHERE id = $PATIENT_ID;"
echo ""
echo "   Vous pouvez utiliser:"
echo "   - MySQL Workbench"
echo "   - mysql -u root -e \"UPDATE users SET telephone = '$PHONE_NUMBER' WHERE id = $PATIENT_ID;\""
echo ""

read -p "   Appuyez sur ENTRÉE une fois le numéro mis à jour... "

echo ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 4 : Créer un rappel avec SMS
# ───────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[ÉTAPE 4]${NC} Création d'un rappel avec SMS..."
echo ""

REMINDER_PAYLOAD=$(cat <<EOF
{
  "title": "Test SMS Twilio - $(date +%H:%M:%S)",
  "description": "Ceci est un test de SMS via Twilio",
  "type": "MEDICATION",
  "reminderTime": "$(date +%H:%M:%S)",
  "reminderDate": "$(date +%Y-%m-%d)",
  "notificationChannels": ["SMS"],
  "notifyPatient": true,
  "notifyCaregiver": false,
  "patientId": $PATIENT_ID,
  "status": "PENDING"
}
EOF
)

echo "   Requête:"
echo "   POST $BACKEND_URL/api/reminders"
echo ""
echo "   Payload:"
echo "$REMINDER_PAYLOAD" | jq '.' 2>/dev/null || echo "$REMINDER_PAYLOAD"
echo ""

RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/reminders" \
  -H "Content-Type: application/json" \
  -d "$REMINDER_PAYLOAD")

echo "   Réponse:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "id"; then
    REMINDER_ID=$(echo "$RESPONSE" | jq '.id' 2>/dev/null || echo "?")
    echo -e "${GREEN}✅${NC} Rappel créé avec succès (ID: $REMINDER_ID)"
else
    echo -e "${RED}❌${NC} Erreur lors de la création du rappel!"
    exit 1
fi

echo ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 5 : Attendre le scheduler
# ───────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[ÉTAPE 5]${NC} Attente de l'envoi du SMS par le scheduler..."
echo ""
echo "   Le scheduler envoie les notifications toutes les 60 secondes."
echo "   Veuillez patienter..."
echo ""

for i in {60..1}; do
    echo -ne "\r   ⏳ Attente: ${i}s restantes... "
    sleep 1
done

echo ""
echo ""
echo -e "${GREEN}✅${NC} Vérification de l'envoi du SMS"
echo ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 6 : Vérifier les logs
# ───────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[ÉTAPE 6]${NC} Vérification des logs..."
echo ""

echo "   Les logs à rechercher:"
echo ""
echo "   ✅ SMS envoyé avec succès"
echo "   Logs: grep \"SMS envoyé avec succès\" logs/app.log"
echo ""
echo "   📲 SMS envoyé (patient)"
echo "   Logs: grep \"SMS envoyé (patient)\" logs/app.log"
echo ""
echo "   ❌ Erreur lors de l'envoi du SMS"
echo "   Logs: grep \"Erreur lors de l'envoi du SMS\" logs/app.log"
echo ""

# ───────────────────────────────────────────────────────────────────
# ÉTAPE 7 : Vérifier dans Twilio Dashboard
# ───────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[ÉTAPE 7]${NC} Vérification dans Twilio Dashboard..."
echo ""

echo "   Allez à: https://www.twilio.com/console/sms/logs"
echo ""
echo "   Cherchez le SMS envoyé à: $PHONE_NUMBER"
echo "   Message: [MemoriA] Rappel: Test SMS Twilio"
echo ""

# ───────────────────────────────────────────────────────────────────
# RÉSUMÉ
# ───────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🎯 RÉSUMÉ DU TEST"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Si vous voyez:"
echo ""
echo -e "${GREEN}✅${NC} Backend en cours d'exécution"
echo -e "${GREEN}✅${NC} Rappel créé avec succès"
echo -e "${GREEN}✅${NC} SMS envoyé avec succès dans les logs"
echo -e "${GREEN}✅${NC} SMS visible dans Twilio Dashboard"
echo ""
echo "Alors l'intégration SMS Twilio fonctionne correctement! 🎉"
echo ""

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔗 LIENS UTILES"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "📚 Documentation:"
echo "   - SMS_QUICK_START.md"
echo "   - SMS_TWILIO_SETUP.md"
echo "   - SMS_INDEX.md"
echo ""

echo "🐛 Dépannage:"
echo "   - Vérifier les logs: tail -f logs/app.log"
echo "   - Chercher \"SMS\": grep -i sms logs/app.log"
echo ""

echo "💬 Contact Twilio:"
echo "   - Dashboard: https://www.twilio.com/console"
echo "   - Support: https://support.twilio.com"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo ""

