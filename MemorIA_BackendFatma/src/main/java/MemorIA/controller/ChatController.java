package MemorIA.controller;

import MemorIA.dto.ChatMessageDTO;
import MemorIA.dto.SendChatMessageRequest;
import MemorIA.service.IChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

/**
 * Chat Controller
 * 
 * Manages chat messages between doctors/soignants and caregivers
 * Endpoints: /api/chat
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:4200", "http://localhost:4300"})
@Slf4j
public class ChatController {

    private final IChatService chatService;

    /**
     * Load chat messages for a specific patient
     * GET /api/chat/messages/{patientId}
     * 
     * @param patientId Patient ID
     * @return List of chat messages
     */
    @GetMapping("/messages/{patientId}")
    public ResponseEntity<List<ChatMessageDTO>> loadMessages(
            @PathVariable Long patientId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {
        log.info("[ChatController] GET /messages/{} - Loading chat messages", patientId);

        try {
            Long userId = parseUserId(userIdHeader);
            String userRole = userRoleHeader != null ? userRoleHeader : "GUEST";

            if (userId == null) {
                log.warn("[ChatController] User not authenticated");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.emptyList());
            }

            // Verify access
            if (!chatService.verifyAccessToPatientChat(userId, patientId)) {
                log.warn("[ChatController] User {} denied access to patient {} chat", userId, patientId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Collections.emptyList());
            }

            List<ChatMessageDTO> messages = chatService.loadChatMessages(patientId);
            log.debug("[ChatController] Loaded {} messages for patient {}", messages.size(), patientId);

            return ResponseEntity.ok(messages);
        } catch (IllegalArgumentException e) {
            log.error("[ChatController] Invalid request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
        } catch (Exception e) {
            log.error("[ChatController] Error loading messages: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    /**
     * Send a chat message
     * POST /api/chat/messages
     * 
     * @param request ChatMessageRequest with patientId and content
     * @return Created ChatMessageDTO
     */
    @PostMapping("/messages")
    public ResponseEntity<ChatMessageDTO> sendMessage(
            @RequestBody SendChatMessageRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {
        log.info("[ChatController] POST /messages - Sending message for patient {}", request.patientId());

        try {
            Long userId = parseUserId(userIdHeader);
            String userRole = userRoleHeader != null ? userRoleHeader : "GUEST";

            if (userId == null) {
                log.warn("[ChatController] User not authenticated");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // Verify access
            if (!chatService.verifyAccessToPatientChat(userId, request.patientId())) {
                log.warn("[ChatController] User {} denied access to patient {} chat", userId, request.patientId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            ChatMessageDTO response = chatService.sendMessage(request, userId, userRole);
            log.debug("[ChatController] Message sent successfully");

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            log.error("[ChatController] Invalid request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("[ChatController] Error sending message: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Mark a message as read
     * POST /api/chat/messages/{messageId}/read
     * 
     * @param messageId Message ID
     * @return Updated ChatMessageDTO
     */
    @PostMapping("/messages/{messageId}/read")
    public ResponseEntity<ChatMessageDTO> markAsRead(@PathVariable Long messageId) {
        log.info("[ChatController] POST /messages/{}/read - Marking message as read", messageId);

        try {
            ChatMessageDTO response = chatService.markMessageAsRead(messageId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("[ChatController] Message not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("[ChatController] Error marking message as read: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get unread message count for a patient
     * GET /api/chat/messages/{patientId}/unread-count
     * 
     * @param patientId Patient ID
     * @return Unread message count
     */
    @GetMapping("/messages/{patientId}/unread-count")
    public ResponseEntity<Integer> getUnreadCount(
            @PathVariable Long patientId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        log.info("[ChatController] GET /messages/{}/unread-count - Getting unread count", patientId);

        try {
            Long userId = parseUserId(userIdHeader);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(0);
            }

            if (!chatService.verifyAccessToPatientChat(userId, patientId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(0);
            }

            int count = chatService.getUnreadMessageCount(patientId);
            return ResponseEntity.ok(count);
        } catch (IllegalArgumentException e) {
            log.error("[ChatController] Patient not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(0);
        } catch (Exception e) {
            log.error("[ChatController] Error getting unread count: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(0);
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Parse user ID from X-User-Id header
     */
    private Long parseUserId(String userIdHeader) {
        if (userIdHeader == null) {
            return null;
        }

        try {
            return Long.parseLong(userIdHeader);
        } catch (NumberFormatException e) {
            log.warn("[ChatController] Cannot parse user ID from header: {}", userIdHeader);
            return null;
        }
    }
}
