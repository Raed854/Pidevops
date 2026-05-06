package MemorIA.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
     * Handles IllegalArgumentException — returns HTTP 400 Bad Request
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());

        Map<String, Object> body = new HashMap<>();
        body.put("status", 400);
        body.put("error", "Bad request");
        body.put("message", ex.getMessage());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * Handles ResponseStatusException — forwards the intended HTTP status code
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", ex.getStatusCode().value());
        body.put("error", ex.getReason() != null ? ex.getReason() : ex.getMessage());

        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }

    /**
     * Catch-all handler — logs the full stack trace and exposes the error type
     * in the response body so it can be seen in the browser Network tab.
     * Remove or restrict this before going to production.
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
