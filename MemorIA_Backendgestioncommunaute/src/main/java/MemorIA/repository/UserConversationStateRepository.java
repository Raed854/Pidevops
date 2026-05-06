package MemorIA.repository;

import MemorIA.entity.community.UserConversationState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserConversationStateRepository extends JpaRepository<UserConversationState, Long> {

    Optional<UserConversationState> findByUserIdAndConversationId(Long userId, Long conversationId);

    List<UserConversationState> findByUserIdAndArchivedTrueAndDeletedFalse(Long userId);

    List<UserConversationState> findByUserIdAndDeletedTrue(Long userId);

    List<UserConversationState> findByUserIdAndBlockedTrue(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM UserConversationState s WHERE s.conversation.id = :conversationId")
    void deleteByConversationId(@org.springframework.data.repository.query.Param("conversationId") Long conversationId);
}