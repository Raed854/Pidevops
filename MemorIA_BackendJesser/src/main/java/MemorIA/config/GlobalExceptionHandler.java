package MemorIA.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles @Valid validation failures on @RequestBody DTOs.
     * Returns HTTP 400 with a map of field → error message.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(err ->
                fieldErrors.put(err.getField(), err.getDefaultMessage()));

        Map<String, Object> body = new HashMap<>();
        body.put("status", 400);
        body.put("error", "Validation failed");
        body.put("details", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * Handles unreadable/unparseable request bodies (malformed JSON, bad enum values,
     * unrecognized date formats, etc.). Returns 400 instead of 500.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        log.warn("Unreadable request body: {}", ex.getMessage());
        Map<String, Object> body = new HashMap<>();
        body.put("status", 400);
        body.put("message", "Corps de la requête invalide ou mal formé. Vérifiez les types et formats des champs.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * Handles database constraint violations (duplicate unique fields, FK violations, etc.)
     * Returns 409 Conflict instead of 500.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        Map<String, Object> body = new HashMap<>();
        body.put("status", 409);
        String msg = ex.getMostSpecificCause().getMessage();
        if (msg != null && msg.contains("numero_securite_sociale")) {
            body.put("message", "Ce numéro de sécurité sociale est déjà utilisé par un autre patient.");
        } else if (msg != null && msg.contains("email")) {
            body.put("message", "Cette adresse email est déjà utilisée.");
        } else {
            body.put("message", "Une contrainte de données a été violée. Vérifiez les champs uniques.");
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    /**
     * Properly translates ResponseStatusException (thrown by services for 404, 403, 409, etc.)
     * into the correct HTTP status code instead of wrapping it in a 500.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", ex.getStatusCode().value());
        body.put("message", ex.getReason() != null ? ex.getReason() : ex.getMessage());
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }

    /**
     * Catch-all handler for truly unexpected exceptions.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAll(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);

        Map<String, Object> body = new HashMap<>();
        body.put("status", 500);
        body.put("exceptionType", ex.getClass().getName());
        body.put("message", ex.getMessage());

        Throwable cause = ex.getCause();
        if (cause != null) {
            body.put("cause", cause.getClass().getName() + ": " + cause.getMessage());
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
