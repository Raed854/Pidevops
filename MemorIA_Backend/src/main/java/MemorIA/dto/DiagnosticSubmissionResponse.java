package MemorIA.dto;

import MemorIA.entity.diagnostic.Diagnostic;
import MemorIA.entity.diagnostic.PatientAnswer;
import MemorIA.entity.diagnostic.Rapport;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO pour la réponse après soumission d'un diagnostic
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiagnosticSubmissionResponse {
    
    private Diagnostic diagnostic;
    private Rapport rapport;
    private List<PatientAnswer> patientAnswers;
    private Double scoreTotal;
    private Double scoreMaximum;
    private Double pourcentageReussite;
    private Integer notificationsSent;
    private String message;
}
