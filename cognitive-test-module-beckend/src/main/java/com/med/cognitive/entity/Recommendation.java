package com.med.cognitive.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.med.cognitive.entity.enums.PriorityLevel;
import com.med.cognitive.entity.enums.RecommendStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entité Recommendation - Stocke les actions prescrites par le médecin à destination de l'aidant
 */
@Entity
@Table(name = "recommendations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Relation vers la décision qui a motivé cette recommandation (optionnel)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decision_id")
    @JsonIgnore
    private Decision decision;

    /**
     * L'ID du test réalisé - optionnel si la recommandation est indépendante
     */
    @Column(name = "test_result_id")
    private Long testResultId;

    /**
     * Le texte de l'action à réaliser
     */
    @NotNull
    @Size(max = 1000)
    @Column(columnDefinition = "TEXT")
    private String action;

    /**
     * Niveau de priorité (LOW, MEDIUM, HIGH, URGENT)
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "priority_level")
    private PriorityLevel priority;

    /**
     * Rôle cible : CAREGIVER (Aidant)
     */
    @NotNull
    @Column(name = "target_role")
    private String targetRole;

    /**
     * Date limite pour réaliser l'action
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "deadline")
    private LocalDateTime deadline;

    /**
     * Statut actuel (PENDING, IN_PROGRESS, COMPLETED, DISMISSED)
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RecommendStatus status = RecommendStatus.PENDING;

    /**
     * Date de création — définie automatiquement par @PrePersist, ne pas envoyer depuis le client
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * ID du médecin qui a créé la recommandation
     */
    @NotNull
    @Column(name = "clinician_id")
    private Long clinicianId;

    /**
     * ID du patient concerné
     */
    @NotNull
    @Column(name = "patient_id")
    private Long patientId;

    /**
     * Notes supplémentaires
     */
    @Column(columnDefinition = "TEXT")
    private String notes;

    /**
     * Date/heure de completion
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * ID de la personne qui a complété la recommandation
     */
    @Column(name = "completed_by")
    private Long completedBy;

    /**
     * Date de dernière mise à jour
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Callback de pré-persistance pour définir la date de création
     */
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = RecommendStatus.PENDING;
        }
    }

    /**
     * Callback de pré-mise à jour pour définir la date de mise à jour
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
