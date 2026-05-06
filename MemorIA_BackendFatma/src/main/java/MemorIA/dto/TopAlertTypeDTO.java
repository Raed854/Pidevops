package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO représentant les types d'alertes les plus fréquents
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopAlertTypeDTO {

    /**
     * Type d'alerte
     */
    @JsonProperty("type")
    private String type;

    /**
     * Nombre d'occurrences
     */
    @JsonProperty("count")
    private Integer count;

    /**
     * Pourcentage pour visualisation (0-100)
     */
    @JsonProperty("percentage")
    private Double percentage;

    /**
     * Sévérité moyenne de ce type
     */
    @JsonProperty("avg_severity")
    private String avgSeverity;

    /**
     * Taux de résolution pour ce type (0-100)
     */
    @JsonProperty("resolution_rate")
    private Double resolutionRate;

    /**
     * Temps moyen de résolution en heures
     */
    @JsonProperty("avg_resolution_time_hours")
    private Double avgResolutionTimeHours;
}

