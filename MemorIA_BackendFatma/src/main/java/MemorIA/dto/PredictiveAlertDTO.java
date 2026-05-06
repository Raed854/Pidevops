package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO représentant une alerte prédictive basée sur l'IA/patterns
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictiveAlertDTO {

    /**
     * Type d'alerte prédit
     */
    @JsonProperty("predicted_type")
    private String predictedType;

    /**
     * Description du pattern détecté
     */
    @JsonProperty("pattern_description")
    private String patternDescription;

    /**
     * Confiance de la prédiction (0-100%)
     */
    @JsonProperty("confidence_score")
    private Double confidenceScore;

    /**
     * Sévérité probable (LOW, MEDIUM, HIGH, CRITICAL)
     */
    @JsonProperty("predicted_severity")
    private String predictedSeverity;

    /**
     * Horizon temporel (j1, j2, j3, j7, etc.)
     */
    @JsonProperty("time_horizon")
    private String timeHorizon;

    /**
     * Facteurs contributifs (ex: "missed medication 3x, low activity")
     */
    @JsonProperty("contributing_factors")
    private String contributingFactors;

    /**
     * Actions recommandées pour prévention
     */
    @JsonProperty("recommended_actions")
    private String recommendedActions;
}
