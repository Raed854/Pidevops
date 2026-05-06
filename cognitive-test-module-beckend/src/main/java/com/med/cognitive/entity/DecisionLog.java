package com.med.cognitive.entity;

import com.med.cognitive.entity.enums.DecisionSource;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Entité DecisionLog - Traçabilité de toutes les modifications et événements liés aux décisions
 */
@Entity
@Table(name = "decision_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DecisionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * ID de la décision concernée
     */
    @NotNull
    @Column(name = "decision_id")
    private Long decisionId;

    /**
     * Qui a déclenché l'action (nom d'utilisateur ou "SYSTEM")
     */
    @Column(name = "triggered_by")
    private String triggeredBy;

    /**
     * La date et heure de l'événement
     */
    @NotNull
    @Column(name = "timestamp", updatable = false)
    private LocalDateTime timestamp;

    /**
     * Des métadonnées supplémentaires (format JSON)
     */
    @Convert(converter = MapToStringConverter.class)
    @Column(name = "metadata", columnDefinition = "TEXT")
    private Map<String, Object> metadata;

    /**
     * L'interprétation associée à ce log
     */
    @Column(name = "interpretation", columnDefinition = "TEXT")
    private String interpretation;

    /**
     * La date du test associé (si applicable)
     */
    @Column(name = "test_date")
    private LocalDateTime testDate;

    /**
     * La source de la décision au moment du log
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "source_type")
    private DecisionSource sourceType;

    /**
     * Version du modèle utilisé (si applicable)
     */
    @Column(name = "model_version")
    private String modelVersion;

    /**
     * Seuil de confiance utilisé (si applicable)
     */
    @Column(name = "confidence_threshold")
    private Double confidenceThreshold;

    /**
     * Callback de pré-persistance pour définir l'horodatage
     */
    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
