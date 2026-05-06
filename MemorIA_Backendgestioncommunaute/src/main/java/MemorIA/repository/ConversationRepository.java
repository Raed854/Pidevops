package MemorIA.repository;

import MemorIA.entity.community.Conversation;
import MemorIA.entity.community.ConversationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /** Find PRIVATE conversation between exactly two users (by participants) */
    @Query("""
            SELECT c FROM Conversation c
            JOIN c.participants p
            WHERE c.type = 'PRIVATE' AND p.id IN (:u1, :u2)
            GROUP BY c
            HAVING COUNT(DISTINCT p.id) = 2
            """)
    Optional<Conversation> findConversationByUsers(@Param("u1") Long u1, @Param("u2") Long u2);

    /**
     * Find all conversations where user participates: PRIVATE (participant) or
     * GROUP (community member)
     */
    @Query("""
            SELECT DISTINCT c FROM Conversation c
            LEFT JOIN c.participants p
            LEFT JOIN c.community co
            LEFT JOIN co.members m
            WHERE (c.type = 'PRIVATE' AND p.id = :userId)
               OR (c.type = 'GROUP' AND m.id = :userId)
            ORDER BY c.id DESC
            """)
    List<Conversation> findConversationsForUser(@Param("userId") Long userId);

    /** Find GROUP conversation by community id */
    Optional<Conversation> findByCommunityIdAndType(Long communityId, ConversationType type);

    default Optional<Conversation> findByCommunityId(Long communityId) {
        return findByCommunityIdAndType(communityId, ConversationType.GROUP);
    }

    /** Find conversations blocked by a specific user */
    @Query("""
            SELECT c FROM Conversation c
            WHERE c.blocked = true AND c.blockedBy.id = :userId
            """)
    List<Conversation> findBlockedByUser(@Param("userId") Long userId);

    /** Count conversations where user is a participant */
    @Query("""
            SELECT COUNT(DISTINCT c) FROM Conversation c
            LEFT JOIN c.participants p
            LEFT JOIN c.community co
            LEFT JOIN co.members m
            WHERE (c.type = 'PRIVATE' AND p.id = :userId)
               OR (c.type = 'GROUP' AND m.id = :userId)
            """)
    long countConversationsForUser(@Param("userId") Long userId);
}