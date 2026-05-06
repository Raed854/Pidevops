package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Dashboard spécifique pour l'accompagnant
 * Montre : alertes du jour, critiques non traitées, taux de confirmation de la semaine, résumé du jour
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaregiverAlertDashboardDTO {
    
    /**
     * Alertes d'aujourd'hui (toutes les alertes créées aujourd'hui)
     */
    @JsonProperty("alerts_today")
    private List<AlertCardDTO> alertsToday;
    
    /**
     * Alertes critiques non traitées (tous les jours)
     */
    @JsonProperty("critical_unhandled")
    private List<AlertCardDTO> criticalUnhandled;
    
    /**
     * Nombre total d'alertes cette semaine
     */
    @JsonProperty("total_alerts_this_week")
    private Integer totalAlertsThisWeek;
    
    /**
     * Nombre d'alertes résolues cette semaine
     */
    @JsonProperty("resolved_alerts_this_week")
    private Integer resolvedAlertsThisWeek;
    
    /**
     * Taux de confirmation/résolution cette semaine (0-100%)
     */
    @JsonProperty("confirmation_rate_percentage")
    private Double confirmationRatePercentage;
    
    /**
     * Résumé généré IA de la journée
     */
    @JsonProperty("daily_summary")
    private DailySummaryDTO dailySummary;
    
    /**
     * Répartition des alertes par patient (aide pour un accompagnant multipatient)
     */
    @JsonProperty("alerts_by_patient")
    private Map<Long, Integer> alertsByPatient; // patientId -> count
    
    /**
     * Indicateur de santé globale : "Tout va bien" / "Attention requise" / "Critique"
     */
    @JsonProperty("health_status")
    private String healthStatus;
}
