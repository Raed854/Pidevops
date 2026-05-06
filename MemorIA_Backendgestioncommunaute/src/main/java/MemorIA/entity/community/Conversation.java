package MemorIA.entity.community;

import MemorIA.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

/**
 * Conversation entity - supports PRIVATE (1:1) and GROUP (community) chats.
 * For PRIVATE: participants hold the two users; community is null.
 * For GROUP: community holds the group; participants come from
 * community.members.
 */
@Entity
@Table(name = "conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private ConversationType type;

    @ManyToOne(fetch = FetchType.EAGER)
    private Community community;

    /** For PRIVATE chats: the two participants */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "conversation_participants", joinColumns = @JoinColumn(name = "conversation_id"), inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> participants = new HashSet<>();

    private boolean blocked;

    @ManyToOne
    private User blockedBy;
}