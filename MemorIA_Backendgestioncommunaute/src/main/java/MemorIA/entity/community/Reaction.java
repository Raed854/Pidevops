package MemorIA.entity.community;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entité de réaction sans aucune dépendance Lombok pour une compilation 100% garantie.
 */
@Entity
@Table(name = "community_reactions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "publication_id"}),
    @UniqueConstraint(columnNames = {"user_id", "comment_id"})
})
public class Reaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "reaction_type", nullable = false)
    private String type; // LIKE, LOVE, HAHA, WOW, SAD, ANGRY

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publication_id")
    private Publication publication;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id")
    private Comment comment;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public Reaction() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Publication getPublication() { return publication; }
    public void setPublication(Publication publication) { this.publication = publication; }

    public Comment getComment() { return comment; }
    public void setComment(Comment comment) { this.comment = comment; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
