package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO comprehensive pour le dashboard d'alertes médecin (Alerts Center)
 * Agrège statistiques globales, évolutions, prédictions pour une vue complète
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertDashboardDTO {

    /**
     * === STATISTIQUES GLOBALES ===
     */

    /**
     * Nombre total d'alertes non traitées (UNREAD + IN_PROGRESS)
     */
    @JsonProperty("total_unhandled_alerts")
    private Integer totalUnhandledAlerts;

    /**
     * Nombre d'alertes critiques depuis 24h
     */
    @JsonProperty("critical_today")
    private Integer criticalToday;

    /**
     * Taux de résolution dans les 24 dernières heures (0-100%)
     */
    @JsonProperty("resolution_rate_24h")
    private Double resolutionRate24h;

    /**
     * Nombre moyen de jours pour résoudre une alerte
     */
    @JsonProperty("avg_resolution_days")
    private Double avgResolutionDays;

    /**
     * Nombre d'alertes escaladées
     */
    @JsonProperty("escalated_alerts_count")
    private Integer escalatedAlertsCount;

    /**
     * Score de santé global du patient (0-100, basé sur patterns d'alertes)
     */
    @JsonProperty("global_health_score")
    private Integer globalHealthScore;

    /**
     * === ÉVOLUTIONS ===
     */

    /**
     * Évolution hebdomadaire (7 semaines)
     * Liste chronologique du lundi au prochain dimanche
     */
    @JsonProperty("weekly_evolution")
    private List<WeeklyAlertDTO> weeklyEvolution;

    /**
     * Évolution quotidienne (7 derniers jours)
     * Ajouté pour répondre au besoin frontend Daily Evolution.
     */
    @JsonProperty("daily_evolution")
    private List<WeeklyAlertDTO> dailyEvolution;

    /**
     * === TOP 3 TYPES D'ALERTES ===
     */

    /**
     * Les 3 types d'alertes les plus fréquentes
     */
    @JsonProperty("top_3_alert_types")
    private List<TopAlertTypeDTO> top3AlertTypes;

    /**
     * === PRÉDICTIONS IA ===
     */

    /**
     * Alertes prédictives (basées sur patterns, tendances)
     */
    @JsonProperty("predictive_alerts")
    private List<PredictiveAlertDTO> predictiveAlerts;

    /**
     * === MÉTADONNÉES ===
     */

    /**
     * ID du patient concerné
     */
    @JsonProperty("patient_id")
    private Long patientId;

    /**
     * Nom du patient
     */
    @JsonProperty("patient_name")
    private String patientName;

    /**
     * Timestamp du dernier calcul du dashboard (ISO 8601)
     */
    @JsonProperty("calculated_at")
    private String calculatedAt;
}

