package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO for alert actions (take in charge, resolve with note)
 */
public record AlertActionRequestDTO(
        @JsonProperty("clinical_note")
        String clinicalNote
) {
}
