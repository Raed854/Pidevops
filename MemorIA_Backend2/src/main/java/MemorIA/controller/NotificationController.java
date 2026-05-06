package MemorIA.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class NotificationController {

    /**
     * Endpoint pour s'abonner aux alertes d'un traitement
     * Frontend se connecte à: /topic/alerts/traitement/{idTraitement}
     */
    @MessageMapping("/subscribe/traitement/{idTraitement}")
    @SendTo("/topic/alerts/traitement/{idTraitement}")
    public String subscribe(@DestinationVariable Long idTraitement) {
        System.out.println("[NotificationController] Client abonné aux alertes du traitement " + idTraitement);
        return "✓ Connecté aux alertes du traitement " + idTraitement;
    }
}
