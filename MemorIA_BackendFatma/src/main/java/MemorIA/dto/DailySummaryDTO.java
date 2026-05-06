package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Résumé généré IA de la journée
 * Basé sur les alertes et reminders manqués du jour
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailySummaryDTO {
    
    /**
     * Résumé texte généré (ex: "3 rappels manqués aujourd'hui : prise de médicament, RDV médecin...")
     */
    @JsonProperty("summary_text")
    private String summaryText;
    
    /**
     * Nombre total d'alertes du jour
     */
    @JsonProperty("total_alerts_count")
    private Integer totalAlertsCount;
    
    /**
     * Nombre d'alertes critiques du jour
     */
    @JsonProperty("critical_alerts_count")
    private Integer criticalAlertsCount;
    
    /**
     * Nombre d'alertes moyennes du jour
     */
    @JsonProperty("medium_alerts_count")
    private Integer mediumAlertsCount;
    
    /**
     * Nombre d'alertes basses du jour
     */
    @JsonProperty("low_alerts_count")
    private Integer lowAlertsCount;
    
    /**
     * Nombre de reminders manqués détectés aujourd'hui
     */
    @JsonProperty("missed_reminders_count")
    private Integer missedRemindersCount;
    
    /**
     * Catégories principales des alertes (ex: ["Médicament", "Rendez-vous", "Activité"])
     */
    @JsonProperty("main_categories")
    private List<String> mainCategories;
    
    /**
     * Recommandation simple pour l'accompagnant
     * ex: "Vérifier l'adhésion aux traitements" ou "Tout va bien, continuer la surveillance"
     */
    @JsonProperty("recommendation")
    private String recommendation;
}
