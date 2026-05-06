package com.med.cognitive.service;

import com.med.cognitive.entity.RecMessage;
import com.med.cognitive.entity.Recommendation;
import com.med.cognitive.repository.RecMessageRepository;
import com.med.cognitive.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service pour la gestion des messages de recommandation (communication médecin ↔ aidant)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecMessageService {

    private final RecMessageRepository messageRepository;
    private final RecommendationRepository recommendationRepository;

    /**
     * Crée et enregistre un nouveau message
     */
    @Transactional
    public RecMessage createMessage(Long recId, String text, RecMessage.SenderType senderType, 
                                   RecMessage.MessagePriority priority) {
        log.info("Creating message for recommendation {} from {}", recId, senderType);
        
        Recommendation recommendation = recommendationRepository.findById(recId)
            .orElseThrow(() -> new IllegalArgumentException("Recommendation not found: " + recId));

        RecMessage message = RecMessage.builder()
            .recommendation(recommendation)
            .recId(recId)
            .text(text)
            .from(senderType)
            .priority(priority)
            .sentAt(LocalDateTime.now())
            .read(false)
            .build();

        return messageRepository.save(message);
    }

    /**
     * Récupère tous les messages d'une recommandation
     */
    public List<RecMessage> getMessagesForRecommendation(Long recId) {
        return messageRepository.findByRecommendationId(recId);
    }

    /**
     * Marque un message comme lu
     */
    @Transactional
    public RecMessage markAsRead(Long messageId, Long readBy) {
        RecMessage message = messageRepository.findById(messageId)
            .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));
        
        message.setRead(true);
        message.setReadBy(readBy);
        message.setReadAt(LocalDateTime.now());
        
        log.info("Message {} marked as read by user {}", messageId, readBy);
        return messageRepository.save(message);
    }

    /**
     * Marque tous les messages d'une recommandation comme lus
     */
    @Transactional
    public void markAllAsRead(Long recId, RecMessage.SenderType senderType, Long readBy) {
        List<RecMessage> messages;
        if (senderType == RecMessage.SenderType.AIDANT) {
            messages = messageRepository.findUnreadFromAidant(recId);
        } else {
            messages = messageRepository.findUnreadFromMedecin(recId);
        }
        
        for (RecMessage message : messages) {
            message.setRead(true);
            message.setReadBy(readBy);
            message.setReadAt(LocalDateTime.now());
        }
        
        messageRepository.saveAll(messages);
        log.info("Marked {} messages as read for recommendation {}", messages.size(), recId);
    }

    /**
     * Récupère les messages non lus envoyés par l'aidant pour une recommandation
     */
    public List<RecMessage> getUnreadFromAidant(Long recId) {
        return messageRepository.findUnreadFromAidant(recId);
    }

    /**
     * Récupère les messages non lus envoyés par le médecin pour une recommandation
     */
    public List<RecMessage> getUnreadFromMedecin(Long recId) {
        return messageRepository.findUnreadFromMedecin(recId);
    }

    /**
     * Compte les messages non lus pour un médecin (tous ses patients/recommandations)
     */
    public Long countUnreadMessagesForDoctor(Long clinicianId) {
        return messageRepository.countUnreadForDoctor(clinicianId);
    }

    /**
     * Compte les messages non lus pour un aidant (son patient)
     */
    public Long countUnreadMessagesForAidant(Long patientId) {
        return messageRepository.countUnreadForAidant(patientId);
    }

    /**
     * Supprime un message (par un administrateur ou le créateur)
     */
    @Transactional
    public void deleteMessage(Long messageId) {
        messageRepository.deleteById(messageId);
        log.info("Message {} deleted", messageId);
    }
}
