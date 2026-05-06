package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScoreGlobalDTO {

    /** Score composite pondéré (z-score normalisé), null si non évaluable */
    private Double globalScore;

    /** "OK" ou "NON_EVALUABLE" */
    private String status;

    /** "VERT" (> -1), "JAUNE" (-2 à -1), "ROUGE" (< -2), null si non évaluable */
    private String colorCode;

    /** Texte d'interprétation clinique */
    private String interpretation;

    /** Nombre de tests valides pris en compte */
    private int testCount;

    /** Score moyen par type de test (z-score) */
    private Map<String, Double> scoreByType;

    /** ID du patient */
    private Long patientId;

    /** Nom complet du patient */
    private String patientName;
}
