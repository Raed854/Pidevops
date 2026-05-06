package MemorIA.service;

import MemorIA.entity.Traitements.AlertPatient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class NotificationService {

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Envoyer alerte en temps réel via WebSocket
     */
    public void sendRealTimeAlert(AlertPatient alert, String phoneNumber, String accompanantName) {
        Long traitementId = alert.getIdTraitement();

        if (messagingTemplate == null) {
            System.out.println("[NotificationService] ⚠️  WebSocket non configuré - alerte ignorée");
            return;
        }

        // Créer le payload de notification
        AlertNotificationPayload payload = new AlertNotificationPayload(
                alert.getIdAlerte(),
                traitementId,
                alert.getAlert(),
                alert.getDateAlerte(),
                accompanantName,
                "SMS envoyé à " + phoneNumber
        );

        try {
            // Envoyer via WebSocket
            messagingTemplate.convertAndSend(
                    "/topic/alerts/traitement/" + traitementId,
                    payload
            );
            System.out.println("[NotificationService] ✓ Notification WebSocket envoyée pour traitement " + traitementId);
        } catch (IllegalArgumentException | IllegalStateException e) {
            System.err.println("[NotificationService] ❌ Erreur WebSocket: " + e.getMessage());
        }
    }

    /**
     * Classe payload pour les notifications
     */
    public static class AlertNotificationPayload {
        public Long alertId;
        public Long traitementId;
        public String message;
        public LocalDateTime timestamp;
        public String accompanantName;
        public String smsStatus;

        public AlertNotificationPayload(Long alertId, Long traitementId, String message,
                                       LocalDateTime timestamp, String accompanantName, String smsStatus) {
            this.alertId = alertId;
            this.traitementId = traitementId;
            this.message = message;
            this.timestamp = timestamp;
            this.accompanantName = accompanantName;
            this.smsStatus = smsStatus;
        }

        // Getters
        public Long getAlertId() { return alertId; }
        public Long getTraitementId() { return traitementId; }
        public String getMessage() { return message; }
        public LocalDateTime getTimestamp() { return timestamp; }
        public String getAccompanantName() { return accompanantName; }
        public String getSmsStatus() { return smsStatus; }
    }
}
