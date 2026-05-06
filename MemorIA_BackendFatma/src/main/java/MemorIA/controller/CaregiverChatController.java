package MemorIA.controller;

import MemorIA.dto.ChatMessageDTO;
import MemorIA.dto.SendChatMessageRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur de communication entre accompagnant et médecin
 * 
 * Permet à l'accompagnant de communiquer avec le médecin/soignant
 * pour discuter des alertes et de la santé du patient
 */
@RestController
@RequestMapping("/api/chat/caregiver")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:4200"})
@Slf4j
public class CaregiverChatController {

    // TODO: Injecter un service de chat

    /**
     * GET /api/chat/caregiver/doctor/{patientId}
     * 
     * Récupère l'historique des messages entre l'accompagnant et le médecin
     * pour un patient spécifique
     * 
     * @param patientId ID du patient
     * @return Liste des messages historiques
     */
    @GetMapping("/doctor/{patientId}")
    @PreAuthorize("hasRole('CAREGIVER') or hasRole('AIDANT')")
    public ResponseEntity<List<ChatMessageDTO>> getChatHistoryWithDoctorForPatient(
            @PathVariable Long patientId) {
        
        log.info("[CaregiverChatController] GET /doctor/{} - Retrieving chat history", patientId);
        
        Long caregiverId = getCurrentUserId();
        // TODO: Vérifier accès au patient
        
        // TODO: Récupérer l'historique des messages
        List<ChatMessageDTO> messages = List.of();
        
        return ResponseEntity.ok(messages);
    }

    /**
     * POST /api/chat/messages
     * 
     * Envoie un message de l'accompagnant au médecin
     * Le message est associé à un patient
     * 
     * @param request Contient patientId, content
     * @return Le message créé avec timestamp
     */
    @PostMapping("/messages")
    @PreAuthorize("hasRole('CAREGIVER') or hasRole('AIDANT')")
    public ResponseEntity<ChatMessageDTO> sendMessageToDoctor(
            @RequestBody SendChatMessageRequest request) {
        
        log.info("[CaregiverChatController] POST /messages - Sending message to doctor");
        
        Long caregiverId = getCurrentUserId();
        
        // TODO: Vérifier accès du caregiver au patient
        verifyAccessToPatient(caregiverId, request.patientId());
        
        // TODO: Créer et sauvegarder le message
        // Service.sendMessage(caregiverId, request.patientId(), request.content());
        
        ChatMessageDTO created = new ChatMessageDTO(
                request.patientId(),
                caregiverId,
                "CAREGIVER",
                null, // senderName - à récupérer
                request.content(),
                java.time.LocalDateTime.now()
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * GET /api/chat/caregiver/unread-count/{patientId}
     * 
     * Récupère le nombre de messages non lus pour un patient
     * Utile pour afficher un badge de notification
     * 
     * @param patientId ID du patient
     * @return Nombre de messages non lus
     */
    @GetMapping("/unread-count/{patientId}")
    @PreAuthorize("hasRole('CAREGIVER') or hasRole('AIDANT')")
    public ResponseEntity<Integer> getUnreadMessageCount(@PathVariable Long patientId) {
        
        log.debug("[CaregiverChatController] GET /unread-count/{} - Getting unread count", patientId);
        
        Long caregiverId = getCurrentUserId();
        verifyAccessToPatient(caregiverId, patientId);
        
        // TODO: Compter les messages non lus
        
        return ResponseEntity.ok(0);
    }

    // ==================== HELPER METHODS ====================

    /**
     * Récupère l'ID de l'utilisateur actuel depuis le contexte de sécurité
     * TODO: À implémenter avec SecurityContextHolder ou @AuthenticationPrincipal
     */
    private Long getCurrentUserId() {
        // Placeholder
        return 1L;
    }

    /**
     * Vérifie que l'accompagnant a accès au patient
     */
    private void verifyAccessToPatient(Long caregiverId, Long patientId) {
        log.debug("[CaregiverChatController] Verifying access for caregiver {} to patient {}", caregiverId, patientId);
        // TODO: Vérifier dans CaregiverLinkRepository
    }
}
