package MemorIA.entity.community;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entité représentant un commentaire sur une publication.
 * Ce modèle gère aussi les réponses (replies) de manière récursive.
 */
@Entity
@Table(name = "publication_comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Le contenu textuel du commentaire (stocké en TEXT pour plus de flexibilité)
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    // L'auteur du commentaire (nom et ID pour la simplicité, évite trop de jointures)
    private String authorName;
    private Long authorId;

    // Date de création, initialisée par défaut
    private LocalDateTime createdAt = LocalDateTime.now();

    // -- Moderation Fields --
    @Column(columnDefinition = "TEXT")
    private String originalContent;
    
    @Column(nullable = false)
    private Boolean pendingApproval = false;
    
    @Column(nullable = false)
    private Integer violationSeverity = 0;

    // Relation vers la publication parente
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publication_id")
    @JsonIgnore // Évite les cycles de sérialisation JSON
    private Publication publication;

    // Relation vers le commentaire parent (pour le système de réponses)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonIgnore
    private Comment parentComment;

    // Liste des réponses directes à ce commentaire
    // Cascade ALL + orphanRemoval assurent la suppression propre des fils
    @OneToMany(mappedBy = "parentComment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("createdAt ASC")
    private List<Comment> replies = new ArrayList<>();
    
    // --- Helpers pour le JSON (évitent les objets complets circulaires) ---

    // Retourne l'ID de la publication parente dans le flux JSON
    public Long getPublicationId() {
        return publication != null ? publication.getId() : null;
    }
    
    // Retourne l'ID du commentaire parent dans le flux JSON (null si c'est un commentaire racine)
    public Long getParentId() {
        return parentComment != null ? parentComment.getId() : null;
    }
}
