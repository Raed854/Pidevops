package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoriquePointDTO {
    private LocalDateTime date;
    private Double zScore;
    private Double scorePercentage;
    private String typeTest;
    private String testTitre;
    private String colorCode;  // VERT, JAUNE, ROUGE
}
