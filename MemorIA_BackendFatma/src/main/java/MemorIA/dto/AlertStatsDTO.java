package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour les statistiques globales d'alertes d'un médecin
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertStatsDTO {

    @JsonProperty("total_alerts")
    private Long totalAlerts;

    @JsonProperty("unresolved_alerts")
    private Long unresolvedAlerts;

    @JsonProperty("critical_alerts")
    private Long criticalAlerts;

    @JsonProperty("escalated_alerts")
    private Long escalatedAlerts;

    @JsonProperty("resolution_rate")
    private Double resolutionRate;

    @JsonProperty("average_resolution_time_hours")
    private Double averageResolutionTimeHours;

    @JsonProperty("most_common_type")
    private String mostCommonType;

    @JsonProperty("critical_patients_count")
    private Long criticalPatientsCount;
}
