package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Complete dashboard data for doctor/soignant
 * Contains all metrics and analytics for a patient's alerts
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorAlertDashboardDTO {

    /**
     * Patient ID
     */
    @JsonProperty("patient_id")
    private Long patientId;

    /**
     * Total unresolved (UNREAD + IN_PROGRESS) alerts
     */
    @JsonProperty("total_unresolved_alerts")
    private Integer totalUnresolvedAlerts;

    /**
     * Total resolved alerts (all time)
     */
    @JsonProperty("total_resolved_alerts")
    private Integer totalResolvedAlerts;

    /**
     * Resolution rate in last 24 hours (percentage 0-100)
     */
    @JsonProperty("resolution_rate_24h")
    private Double resolutionRate24h;

    /**
     * Overall resolution rate (percentage 0-100)
     */
    @JsonProperty("resolution_rate_overall")
    private Double resolutionRateOverall;

    /**
     * Average time to resolve alerts (in hours)
     */
    @JsonProperty("avg_resolution_time_hours")
    private Double avgResolutionTimeHours;

    /**
     * Daily evolution data for last 7-8 days
     */
    @JsonProperty("daily_evolution")
    private List<DailyEvolutionDTO> dailyEvolution;

    /**
     * Top 3 most frequent alert types
     */
    @JsonProperty("top_3_alert_types")
    private List<TopAlertTypeDTO> top3AlertTypes;

    /**
     * Predictive alerts based on patterns and history
     */
    @JsonProperty("predictive_alerts")
    private List<PredictiveAlertDTO> predictiveAlerts;

    /**
     * Current critical alerts (unresolved with CRITICAL severity)
     */
    @JsonProperty("critical_alerts_count")
    private Integer criticalAlertsCount;

    /**
     * Average gravity score (0-100)
     */
    @JsonProperty("avg_gravity_score")
    private Double avgGravityScore;

    /**
     * Timestamp when this dashboard was generated
     */
    @JsonProperty("generated_at")
    private String generatedAt;
}
