package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO pour la requête d'ajout de note clinique
 */
public record AddClinicalNoteRequest(
        @JsonProperty("clinical_note")
        String clinicalNote
) {
}
