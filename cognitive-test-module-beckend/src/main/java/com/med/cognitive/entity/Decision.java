package com.med.cognitive.entity;

import com.med.cognitive.entity.enums.DecisionSource;
import com.med.cognitive.entity.enums.TypeTest;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entité Decision - Stocke les résultats d'analyse des tests cognitifs du patient
 */
@Entity
@Table(name = "decisions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Decision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * ID du patient concerné
     */
    @NotNull
    @Column(name = "patient_id")
    private String patientId;

    /**
     * ID du test réalisé (lien vers les résultats bruts)
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_result_id")
    private TestResult testResult;

    /**
     * Type de test réalisé (MEMORY, LANGUAGE, REFLECTION, CONFUSION)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "test_type")
    private TypeTest testType;

    /**
     * Type de décision
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "decision_type")
    private DecisionType decisionType;

    /**
     * Niveau de risque calculé
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level")
    private RiskLevel riskLevel;

    /**
     * Le pourcentage de confiance du modèle (entre 0 et 1)
     */
    @Column(name = "confidence")
    private Double confidence;

    /**
     * Une explication textuelle lisible par le médecin
     */
    @Column(name = "explanation", length = 2000, columnDefinition = "TEXT")
    private String explanation;

    /**
     * L'origine de la décision (AI-MODEL, RULE-BASED, MANUAL, HYBRID)
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "source_type")
    private DecisionSource sourceType;

    /**
     * La date et heure de création
     */
    @NotNull
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * L'identifiant de la personne qui a créé la décision (médecin ou système)
     */
    @NotNull
    @Column(name = "created_by")
    private String createdBy;

    /**
     * Indicateur d'approbation par le médecin
     */
    @Builder.Default
    @Column(name = "approved")
    private Boolean approved = false;

    /**
     * ID du médecin qui a approuvé
     */
    @Column(name = "approved_by")
    private String approvedBy;

    /**
     * Date d'approbation
     */
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    /**
     * Liste des recommandations associées à cette décision
     */
    @OneToMany(mappedBy = "decision", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Recommendation> recommendations = new ArrayList<>();

    /**
     * Callback de pré-persistance pour définir la date de création
     */
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (approved == null) {
            approved = false;
        }
    }

    /**
     * Type de décision
     */
    public enum DecisionType {
        SURVEILLANCE("Surveillance recommandée"),
        ALERTE("Alerte : action nécessaire"),
        CONSULTATION("Consultation recommandée"),
        URGENCE("Cas urgent");

        private final String description;

        DecisionType(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    /**
     * Niveau de risque
     */
    public enum RiskLevel {
        FAIBLE("Risque faible"),
        MOYEN("Risque moyen"),
        ELEVE("Risque élevé"),
        CRITIQUE("Risque critique");

        private final String description;

        RiskLevel(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }
}
