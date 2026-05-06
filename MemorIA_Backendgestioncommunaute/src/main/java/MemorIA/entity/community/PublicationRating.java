package MemorIA.entity.community;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "community_publication_ratings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "publication_id"})
})
public class PublicationRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "rating_value", nullable = false)
    private Integer value; // 1 to 5

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publication_id", nullable = false)
    private Publication publication;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public PublicationRating() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Integer getValue() { return value; }
    public void setValue(Integer value) { this.value = value; }

    public Publication getPublication() { return publication; }
    public void setPublication(Publication publication) { this.publication = publication; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
