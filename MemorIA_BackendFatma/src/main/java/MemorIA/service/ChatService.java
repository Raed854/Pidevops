package MemorIA.service;

import MemorIA.dto.ChatMessageDTO;
import MemorIA.dto.SendChatMessageRequest;
import MemorIA.entity.ChatMessage;
import MemorIA.entity.Patient;
import MemorIA.entity.User;
import MemorIA.repository.ChatMessageRepository;
import MemorIA.repository.CaregiverLinkRepository;
import MemorIA.repository.PatientRepository;
import MemorIA.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service implementation for managing chat messages
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService implements IChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final CaregiverLinkRepository caregiverLinkRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageDTO> loadChatMessages(Long patientId) {
        log.info("[ChatService] Loading chat messages for patient {}", patientId);

        // Verify patient exists
        Patient patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + patientId));

        // Get all messages for this patient
        List<ChatMessage> messages = chatMessageRepository.findByPatientIdOrderByCreatedAtDesc(patientId);

        // Convert to DTOs
        return messages.stream()
            .map(this::convertToDTO)
            .toList();
    }

    @Override
    @Transactional
    public ChatMessageDTO sendMessage(SendChatMessageRequest request, Long senderId, String senderRole) {
        log.info("[ChatService] Sending message for patient {} from user {} (role: {})", 
            request.patientId(), senderId, senderRole);

        // Verify patient exists
        Patient patient = patientRepository.findById(request.patientId())
            .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + request.patientId()));

        // Verify sender exists
        User sender = userRepository.findById(senderId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + senderId));

        // Verify access (caregiver must be linked to patient, doctor/soignant can access any)
        if ("CAREGIVER".equalsIgnoreCase(senderRole) || "ACCOMPAGNANT".equalsIgnoreCase(senderRole)) {
            if (caregiverLinkRepository.findByCaregiverIdAndPatientId(senderId, request.patientId()).isEmpty()) {
                throw new IllegalArgumentException("Caregiver not linked to this patient");
            }
        }

        // Create and persist the message
        ChatMessage message = new ChatMessage();
        message.setPatient(patient);
        message.setSender(sender);
        message.setContent(request.content());
        message.setRead(false);
        message.setCreatedAt(LocalDateTime.now());

        ChatMessage saved = chatMessageRepository.save(message);
        log.debug("[ChatService] Message saved with ID {}", saved.getId());

        return convertToDTO(saved);
    }

    @Override
    @Transactional
    public ChatMessageDTO markMessageAsRead(Long messageId) {
        log.info("[ChatService] Marking message {} as read", messageId);

        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));

        message.setRead(true);
        ChatMessage updated = chatMessageRepository.save(message);

        return convertToDTO(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public int getUnreadMessageCount(Long patientId) {
        log.debug("[ChatService] Getting unread message count for patient {}", patientId);

        // Verify patient exists
        if (!patientRepository.existsById(patientId)) {
            throw new IllegalArgumentException("Patient not found: " + patientId);
        }

        List<ChatMessage> unreadMessages = chatMessageRepository.findUnreadByPatientId(patientId);
        return unreadMessages.size();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean verifyAccessToPatientChat(Long userId, Long patientId) {
        log.debug("[ChatService] Verifying access for user {} to patient {}", userId, patientId);

        // Check if patient exists
        if (!patientRepository.existsById(patientId)) {
            return false;
        }

        // Get user to check role
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return false;
        }

        String role = user.getRole().toUpperCase();

        // Doctors and soignants can access any patient's chat
        if ("DOCTOR".equals(role) || "SOIGNANT".equals(role)) {
            return true;
        }

        // Caregivers must be linked to the patient
        if ("CAREGIVER".equals(role) || "ACCOMPAGNANT".equals(role)) {
            return caregiverLinkRepository.findByCaregiverIdAndPatientId(userId, patientId).isPresent();
        }

        return false;
    }

    /**
     * Convert ChatMessage entity to DTO
     */
    private ChatMessageDTO convertToDTO(ChatMessage message) {
        return new ChatMessageDTO(
            message.getPatient().getId(),
            message.getSender().getId(),
            message.getSender().getRole().toUpperCase(),
            message.getSender().getPrenom() + " " + message.getSender().getNom(),
            message.getContent(),
            message.getCreatedAt()
        );
    }
}
