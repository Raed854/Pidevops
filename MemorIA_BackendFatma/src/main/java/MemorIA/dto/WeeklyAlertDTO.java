package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO représentant l'évolution des alertes sur une semaine
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeeklyAlertDTO {

    /**
     * Date de la semaine (généralement le lundi)
     */
    @JsonProperty("week_start")
    private LocalDate weekStart;

    /**
     * Nombre total d'alertes cette semaine
     */
    @JsonProperty("total_alerts")
    private Integer totalAlerts;

    /**
     * Nombre d'alertes critiques cette semaine
     */
    @JsonProperty("critical_alerts")
    private Integer criticalAlerts;

    /**
     * Nombre d'alertes résolues cette semaine
     */
    @JsonProperty("resolved_alerts")
    private Integer resolvedAlerts;

    /**
     * Taux de résolution (0-100%)
     */
    @JsonProperty("resolution_rate")
    private Double resolutionRate;

    /**
     * Évolution par rapport à la semaine précédente (positive = plus d'alertes)
     */
    @JsonProperty("trend")
    private Integer trend;
}
