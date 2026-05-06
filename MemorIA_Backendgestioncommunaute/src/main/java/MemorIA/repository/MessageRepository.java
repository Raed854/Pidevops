package MemorIA.repository;

import MemorIA.entity.community.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** Find all non-deleted messages in a conversation, ordered by creation time */
    List<Message> findByConversationIdAndIsDeletedFalseOrderByCreatedAt(Long conversationId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Message m WHERE m.conversation.id = :conversationId")
    void deleteByConversationId(@org.springframework.data.repository.query.Param("conversationId") Long conversationId);

    List<Message> findByContentContainingIgnoreCaseAndIsDeletedFalse(String content);

    List<Message> findByTagsContainingIgnoreCaseAndIsDeletedFalse(String tags);

    /** Count messages sent by a specific user */
    long countBySenderId(Long senderId);

    /** Count messages sent by a user after a given date */
    long countBySenderIdAndCreatedAtAfter(Long senderId, LocalDateTime after);

    /** Count messages created between two dates */
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    /** Find messages with file attachments in a conversation */
    List<Message> findByConversationIdAndFileUrlIsNotNullAndIsDeletedFalseOrderByCreatedAtDesc(Long conversationId);
}
