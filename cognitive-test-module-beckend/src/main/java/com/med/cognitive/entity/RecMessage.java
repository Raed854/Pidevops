package com.med.cognitive.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entité RecMessage - Stocke les messages échangés entre médecin et aidant sur une recommandation
 */
@Entity
@Table(name = "rec_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Relation vers la recommandation associée
     */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recommendation_id")
    private Recommendation recommendation;

    /**
     * ID de la recommandation (pour la sérialisation JSON)
     */
    @Column(name = "recommendation_id", insertable = false, updatable = false)
    private Long recId;

    /**
     * Le contenu du message
     */
    @NotNull
    @Size(max = 2000)
    @Column(columnDefinition = "TEXT")
    private String text;

    /**
     * Expéditeur du message : 'aidant' ou 'medecin'
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type")
    private SenderType from;

    /**
     * Priorité du message : NORMALE ou HAUTE
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "message_priority")
    private MessagePriority priority;

    /**
     * Date/heure d'envoi
     */
    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    /**
     * Indique si le message a été lu
     */
    @Builder.Default
    @Column(name = "is_read")
    private Boolean read = false;

    /**
     * ID de la personne qui a lu le message (médecin ou aidant)
     */
    @Column(name = "read_by")
    private Long readBy;

    /**
     * Date/heure de lecture
     */
    @Column(name = "read_at")
    private LocalDateTime readAt;

    @PrePersist
    protected void onCreate() {
        if (sentAt == null) {
            sentAt = LocalDateTime.now();
        }
        if (priority == null) {
            priority = MessagePriority.NORMALE;
        }
        if (read == null) {
            read = false;
        }
    }

    public enum SenderType {
        AIDANT, MEDECIN
    }

    public enum MessagePriority {
        NORMALE, HAUTE
    }
}
