package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Daily evolution data point for alert graphs
 * Represents alert metrics for a single day
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyEvolutionDTO {

    /**
     * Date in ISO format (YYYY-MM-DD)
     */
    @JsonProperty("date")
    private String date;

    /**
     * Total alerts for this day
     */
    @JsonProperty("total_alerts")
    private Integer totalAlerts;

    /**
     * Critical alerts count
     */
    @JsonProperty("critical_count")
    private Integer criticalCount;

    /**
     * Medium severity alerts count
     */
    @JsonProperty("medium_count")
    private Integer mediumCount;

    /**
     * Low severity alerts count
     */
    @JsonProperty("low_count")
    private Integer lowCount;

    /**
     * Resolved alerts count
     */
    @JsonProperty("resolved_count")
    private Integer resolvedCount;

    /**
     * Average gravity score for the day (0-100)
     */
    @JsonProperty("avg_gravity_score")
    private Double avgGravityScore;

    /**
     * New alerts created this day
     */
    @JsonProperty("new_alerts")
    private Integer newAlerts;

    /**
     * Alerts resolved this day
     */
    @JsonProperty("alerts_resolved")
    private Integer alertsResolved;
}
