package MemorIA.service;

import MemorIA.config.TwilioConfig;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Service pour envoyer des SMS via Twilio
 * Utilise la configuration depuis application.properties
 */
@Service
public class SmsService {

    private static final Logger logger = LoggerFactory.getLogger(SmsService.class);

    private final TwilioConfig twilioConfig;

    @Autowired
    public SmsService(TwilioConfig twilioConfig) {
        this.twilioConfig = twilioConfig;
    }

    /**
     * Envoie un SMS à un numéro de téléphone donné
     *
     * @param toPhoneNumber Numéro de destination (format international: +33612345678)
     * @param messageBody   Contenu du message
     * @return true si succès, false si erreur
     */
    public boolean sendSms(String toPhoneNumber, String messageBody) {
        // Vérifier si SMS est activé
        if (!twilioConfig.isSmsEnabled()) {
            logger.debug("ℹ️  SMS désactivé - message non envoyé à {}", toPhoneNumber);
            return false;
        }

        // Valider le numéro de destination
        if (toPhoneNumber == null || toPhoneNumber.trim().isEmpty()) {
            logger.warn("⚠️  Numéro de téléphone vide ou null");
            return false;
        }

        // Valider le message
        if (messageBody == null || messageBody.trim().isEmpty()) {
            logger.warn("⚠️  Contenu du message vide ou null");
            return false;
        }

        try {
            // Formater le numéro si nécessaire (ajouter + si absent)
            String formattedNumber = formatPhoneNumber(toPhoneNumber);

            // Envoyer le SMS via Twilio
            Message message = Message.creator(
                    new PhoneNumber(formattedNumber),      // To number
                    new PhoneNumber(twilioConfig.getPhoneNumber()),  // From number
                    messageBody                             // Message body
            ).create();

            logger.info("✅ SMS envoyé avec succès | To: {} | SID: {} | Longueur: {} chars",
                    formattedNumber, message.getSid(), messageBody.length());

            return true;

        } catch (Exception e) {
            logger.error("❌ Erreur lors de l'envoi du SMS à {}: {}", toPhoneNumber, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Formate le numéro de téléphone pour Twilio (format international)
     *
     * @param phoneNumber Numéro brut
     * @return Numéro formaté au format international (+33...)
     */
    private String formatPhoneNumber(String phoneNumber) {
        if (phoneNumber == null) {
            return "";
        }

        String cleaned = phoneNumber.replaceAll("[^0-9+]", "");

        // Si le numéro commence déjà par +, le retourner
        if (cleaned.startsWith("+")) {
            return cleaned;
        }

        // Si le numéro commence par 0 (France), remplacer par +33
        if (cleaned.startsWith("0")) {
            return "+33" + cleaned.substring(1);
        }

        // Sinon, ajouter le + en début
        return "+" + cleaned;
    }
}


