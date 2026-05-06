package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO pour la requête de résolution d'alerte
 */
public record ResolveAlertRequest(
        @JsonProperty("clinical_note")
        String clinicalNote
) {
}
