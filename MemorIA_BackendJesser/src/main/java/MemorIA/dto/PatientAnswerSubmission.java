package MemorIA.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour soumettre une réponse individuelle d'un patient
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientAnswerSubmission {
    
    private Long questionId;
    private String reponseText;
    private Double tempsReponseSecondes; // Temps pris par le patient pour répondre (en secondes)
}
