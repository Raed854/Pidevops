package MemorIA.service;

import MemorIA.dto.ChatMessageDTO;
import MemorIA.dto.SendChatMessageRequest;

import java.util.List;

/**
 * Service interface for managing chat messages between doctors/soignants and caregivers
 */
public interface IChatService {

    /**
     * Load all chat messages for a specific patient
     * @param patientId ID of the patient
     * @return List of chat messages ordered by creation date
     */
    List<ChatMessageDTO> loadChatMessages(Long patientId);

    /**
     * Send a chat message
     * @param request Contains patientId and message content
     * @param senderId ID of the sender (doctor, soignant, or caregiver)
     * @param senderRole Role of the sender
     * @return The created chat message DTO
     */
    ChatMessageDTO sendMessage(SendChatMessageRequest request, Long senderId, String senderRole);

    /**
     * Mark a message as read
     * @param messageId ID of the message
     * @return Updated chat message
     */
    ChatMessageDTO markMessageAsRead(Long messageId);

    /**
     * Get unread message count for a patient
     * @param patientId ID of the patient
     * @return Count of unread messages
     */
    int getUnreadMessageCount(Long patientId);

    /**
     * Verify that a user has access to a patient's chat
     * @param userId ID of the user
     * @param patientId ID of the patient
     * @return true if access is granted
     */
    boolean verifyAccessToPatientChat(Long userId, Long patientId);
}
