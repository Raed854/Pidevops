package MemorIA.config;

import com.twilio.Twilio;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

/**
 * Configuration Twilio pour initialiser le client SMS
 * Charge les paramètres depuis application.properties
 */
@Configuration
public class TwilioConfig {

    private static final Logger logger = LoggerFactory.getLogger(TwilioConfig.class);

    @Value("${twilio.account.sid}")
    private String accountSid;

    @Value("${twilio.auth.token}")
    private String authToken;

    @Value("${twilio.phone.number}")
    private String phoneNumber;

    @Value("${sms.enabled:true}")
    private Boolean smsEnabled;

    public String getAccountSid() {
        return accountSid;
    }

    public String getAuthToken() {
        return authToken;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public Boolean isSmsEnabled() {
        return smsEnabled;
    }

    @PostConstruct
    public void initTwilio() {
        if (smsEnabled) {
            try {
                Twilio.init(accountSid, authToken);
                logger.info("✅ Twilio initialisé avec succès | Numéro: {}", phoneNumber);
            } catch (Exception e) {
                logger.error("❌ Erreur lors de l'initialisation de Twilio: {}", e.getMessage(), e);
            }
        } else {
            logger.info("ℹ️  SMS désactivé (sms.enabled=false)");
        }
    }
}

