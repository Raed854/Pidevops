package MemorIA.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Call;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import com.twilio.type.Twiml;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TwilioService {

    @Value("${twilio.account-sid}")
    private String accountSid;

    @Value("${twilio.auth-token}")
    private String authToken;

    @Value("${twilio.phone-number}")
    private String fromPhoneNumber;

    @PostConstruct
    public void init() {
        if (accountSid == null || accountSid.isBlank()
                || authToken == null || authToken.isBlank()) {
            System.out.println("[TwilioService] Twilio credentials not set — SMS/Voice disabled");
            return;
        }
        Twilio.init(accountSid, authToken);
    }

    /**
     * Envoyer un SMS a l'accompagnant
     */
    public void sendSms(String toPhoneNumber, String messageBody) {
        try {
            Message message = Message.creator(
                    new PhoneNumber(toPhoneNumber),
                    new PhoneNumber(fromPhoneNumber),
                    messageBody
            ).create();
            System.out.println("[TwilioService] SMS envoyé: " + message.getSid());
        } catch (Exception e) {
            System.err.println("[TwilioService] Erreur SMS: " + e.getMessage());
        }
    }

    /**
     * Appeler l'accompagnant avec un message vocal d'alerte
     */
    public void makeCall(String toPhoneNumber, String patientName) {
        try {
            String twimlMessage = "<Response><Say language=\"fr-FR\">"
                    + "Alerte MemorIA! Le patient " + patientName
                    + " a quitté sa zone autorisée. Veuillez intervenir immédiatement."
                    + "</Say><Pause length=\"1\"/><Say language=\"fr-FR\">"
                    + "Je répète: le patient " + patientName
                    + " est en dehors de sa zone de sécurité."
                    + "</Say></Response>";

            Call call = Call.creator(
                    new PhoneNumber(toPhoneNumber),
                    new PhoneNumber(fromPhoneNumber),
                    new Twiml(twimlMessage)
            ).create();
            System.out.println("[TwilioService] Appel lancé: " + call.getSid());
        } catch (Exception e) {
            System.err.println("[TwilioService] Erreur appel: " + e.getMessage());
        }
    }
}
