package MemorIA.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO pour soumettre un diagnostic complet avec toutes les réponses du patient
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiagnosticSubmissionRequest {
    
    private Long userId;
    private String titre;
    private List<PatientAnswerSubmission> reponses;
    private Boolean mazeCompleted;
}
