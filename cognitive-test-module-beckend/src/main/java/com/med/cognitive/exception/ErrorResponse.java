package com.med.cognitive.exception;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
public class ErrorResponse {
    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private Map<String, String> validationErrors;
    /** Niveau de gravité : INFO, WARNING, ERROR, CRITICAL */
    private String severity;
    /** Code couleur CSS associé au niveau de gravité */
    private String colorCode;

    public ErrorResponse(LocalDateTime timestamp, int status, String error,
                         String message, Map<String, String> validationErrors) {
        this.timestamp = timestamp;
        this.status = status;
        this.error = error;
        this.message = message;
        this.validationErrors = validationErrors;
    }
}
