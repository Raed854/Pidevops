package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDTO {

    /** Nombre de patients avec z_global < -2 */
    private int patientsEnAlerteRouge;

    /** Nombre de patients avec z_global entre -2 et -1 */
    private int patientsEnSurveillanceJaune;

    /** Nombre de patients avec z_global > -1 */
    private int patientsNormaux;

    /** Tests assignés dont la dateLimite est dépassée */
    private int testsEnRetard;

    /** Tests complétés cette semaine */
    private int testsCompletesCetteSemaine;

    /** Total tests assignés (toutes statuts) */
    private int totalTests;

    /** Taux de complétion en % */
    private double tauxCompletion;

    /** Nb tests complétés par mois (6 derniers mois) → pour le graphique */
    private Map<String, Long> testsParMois;

    /** Top 3 patients nécessitant une attention urgente */
    private List<PatientAlerteSummary> patientsUrgents;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PatientAlerteSummary {
        private Long patientId;
        private String patientName;
        private Double zGlobal;
        private String colorCode;  // ROUGE, JAUNE, VERT
        private String tendance;   // DEGRADATION, STABLE, AMELIORATION
    }
}
