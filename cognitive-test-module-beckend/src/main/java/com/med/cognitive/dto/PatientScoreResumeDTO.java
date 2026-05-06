package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientScoreResumeDTO {
    private Long patientId;
    private String patientNom;
    private String patientPrenom;
    private Double zGlobal;
    private String colorCode;         // VERT, JAUNE, ROUGE, GRIS
    private String tendance;          // DEGRADATION, STABLE, AMELIORATION, INCONNU
    private int testCount;
    private LocalDateTime derniereDate;
    private String interpretation;
}
