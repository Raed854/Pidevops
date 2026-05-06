package MemorIA.service;

import MemorIA.entity.community.Conversation;
import MemorIA.entity.community.ConversationType;
import MemorIA.entity.community.Message;
import MemorIA.entity.Role;
import MemorIA.entity.User;
import MemorIA.repository.ConversationRepository;
import MemorIA.repository.MessageRepository;
import MemorIA.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepo;
    private final ConversationRepository conversationRepo;
    private final UserRepository userRepo;
    private final GroqTranscriptionService groqTranscriptionService;

    private void validateRole(Long userId) {
        User u = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found: " + userId));
        if (u.getRole() != Role.SOIGNANT && u.getRole() != Role.ACCOMPAGNANT) {
            throw new RuntimeException("Only DOCTOR and CAREGIVER can send messages");
        }
    }

    private boolean canSend(Conversation c) {
        if (c.isBlocked())
            return false;
        if (c.getType() == ConversationType.GROUP && c.getCommunity() != null && c.getCommunity().isBlocked()) {
            return false;
        }
        return true;
    }

    @Transactional
    public Message send(Long userId, Long convId, String content, String imageUrl, String fileUrl, String fileType,
            String tags, Long forwardedFromMessageId, Long replyToMessageId) {
        validateRole(userId);
        Conversation c = conversationRepo.findById(convId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        if (!canSend(c)) {
            throw new RuntimeException("Cannot send: conversation or community is blocked");
        }
        Message m = new Message();
        m.setContent(content != null ? content : "");
        m.setImageUrl(imageUrl);
        m.setFileUrl(fileUrl);
        m.setFileType(fileType);
        m.setTags(tags);
        m.setSender(userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found")));
        m.setConversation(c);
        
        // Transcription is now handled via a separate endpoint
        
        if (forwardedFromMessageId != null) {
            messageRepo.findById(forwardedFromMessageId).ifPresent(m::setForwardedFrom);
        }
        if (replyToMessageId != null) {
            messageRepo.findById(replyToMessageId).ifPresent(m::setReplyTo);
        }
        return messageRepo.save(m);
    }

    public List<Message> getByConversation(Long convId) {
        return messageRepo.findByConversationIdAndIsDeletedFalseOrderByCreatedAt(convId);
    }

    @Transactional
    public void deleteMessage(Long messageId, Long userId) {
        Message m = messageRepo.findById(messageId).orElseThrow(() -> new RuntimeException("Message not found"));
        User actor = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (!m.getSender().getId().equals(userId) && actor.getRole() != Role.SOIGNANT) {
            throw new RuntimeException("Only the sender or doctors can delete this message");
        }
        m.setDeleted(true);
        messageRepo.save(m);
    }

    @Transactional
    public Message updateMessage(Long messageId, Long userId, String content, String tags) {
        Message m = messageRepo.findById(messageId).orElseThrow(() -> new RuntimeException("Message not found"));
        if (!m.getSender().getId().equals(userId)) {
            throw new RuntimeException("Only the sender can update this message");
        }
        if (content != null)
            m.setContent(content);
        if (tags != null)
            m.setTags(tags);
        return messageRepo.save(m);
    }

    @Transactional
    public Message transcribeMessage(Long messageId) {
        Message m = messageRepo.findById(messageId).orElseThrow(() -> new RuntimeException("Message not found"));
        
        String fileType = m.getFileType();
        String fileUrl = m.getFileUrl();
        
        if (fileType != null && (fileType.startsWith("audio/") || fileUrl.endsWith(".webm") || fileUrl.endsWith(".m4a")) && fileUrl != null) {
            String transcription = groqTranscriptionService.transcribeAudio(fileUrl);
            if (transcription != null && !transcription.isBlank()) {
                String currentContent = m.getContent();
                if (currentContent != null && currentContent.contains("\n\n--- Transcription ---\n")) {
                    return m; // Already transcribed
                }
                
                if (currentContent == null || currentContent.isBlank() || currentContent.startsWith("voicemessage_")) {
                    m.setContent("\n\n--- Transcription ---\n" + transcription);
                } else {
                    m.setContent(currentContent + "\n\n--- Transcription ---\n" + transcription);
                }
                return messageRepo.save(m);
            } else {
                log.warn("Transcription service unavailable for message {}", messageId);
                // Add a marker indicating transcription was attempted but failed
                String currentContent = m.getContent();
                String marker = "\n\n[⚠️ Transcription service unavailable - please try again later]";
                if (currentContent == null || currentContent.isBlank()) {
                    m.setContent(marker);
                } else if (!currentContent.contains("Transcription service unavailable")) {
                    m.setContent(currentContent + marker);
                }
                return messageRepo.save(m);
            }
        } else {
             throw new RuntimeException("Message does not contain a supported audio file.");
        }
    }


    @Transactional
    public Message forward(Long userId, Long sourceMessageId, Long targetConversationId) {
        Message source = messageRepo.findById(sourceMessageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        return send(userId, targetConversationId,
                source.getContent(), source.getImageUrl(), source.getFileUrl(), source.getFileType(), source.getTags(),
                source.getForwardedFrom() != null ? source.getForwardedFrom().getId() : source.getId(),
                null);
    }

    public List<Message> search(String query) {
        return messageRepo.findByContentContainingIgnoreCaseAndIsDeletedFalse(query);
    }

    public List<Message> getMediaByConversation(Long convId) {
        return messageRepo.findByConversationIdAndFileUrlIsNotNullAndIsDeletedFalseOrderByCreatedAtDesc(convId);
    }
}
