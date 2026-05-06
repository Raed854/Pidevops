package MemorIA.entity.community;

import MemorIA.entity.User;
import jakarta.persistence.*;
import lombok.*;

/**
 * Per-user state for a conversation: archive, delete (remove from my list).
 * Like Facebook Messenger - "delete for me" or "archive".
 */
@Entity
@Table(name = "user_conversation_states", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "conversation_id"})
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class UserConversationState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User user;

    @ManyToOne
    private Conversation conversation;

    /** User has archived this conversation */
    private boolean archived;
    private boolean blocked; // <-- Assurez-vous que ce champ existe

    /** User has "deleted" (removed from list) this conversation */
    private boolean deleted;
}
