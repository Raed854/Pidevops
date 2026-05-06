package MemorIA.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Gestionnaire global des exceptions pour l'API
 * Centralise la gestion des erreurs et fournit des réponses uniformes
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException ex, WebRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String message = ex.getReason() != null ? ex.getReason() : status.getReasonPhrase();

        if (status.is5xxServerError()) {
            log.error("[api-error] {} {} path={}", status.value(), message, extractPath(request), ex);
        } else {
            log.warn("[api-error] {} {} path={}", status.value(), message, extractPath(request));
        }

        return ResponseEntity.status(status).body(errorBody(status, message, request, null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(MethodArgumentNotValidException ex, WebRequest request) {
        Map<String, String> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() == null ? "Invalid value" : fe.getDefaultMessage(),
                        (first, second) -> first,
                        LinkedHashMap::new
                ));

        log.warn("[api-error] 400 validation failure path={} errors={}", extractPath(request), fieldErrors);
        return ResponseEntity.badRequest().body(errorBody(HttpStatus.BAD_REQUEST, "Validation failed", request, fieldErrors));
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    public ResponseEntity<Map<String, Object>> handleAccessDenied(Exception ex, WebRequest request) {
        log.warn("[api-error] 403 access denied path={} message={}", extractPath(request), ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(errorBody(HttpStatus.FORBIDDEN, "Access denied", request, null));
    }

    @ExceptionHandler({AuthenticationException.class, BadCredentialsException.class})
    public ResponseEntity<Map<String, Object>> handleAuthentication(Exception ex, WebRequest request) {
        log.warn("[api-error] 401 authentication failure path={} message={}", extractPath(request), ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorBody(HttpStatus.UNAUTHORIZED, "Authentication required or invalid credentials", request, null));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex, WebRequest request) {
        log.error("[api-error] 400 data integrity path={} message={}", extractPath(request), ex.getMessage(), ex);
        return ResponseEntity.badRequest().body(errorBody(
                HttpStatus.BAD_REQUEST,
                "Database constraint error. Verify alert status/severity/type values.",
                request,
                null
        ));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> handleDataAccess(DataAccessException ex, WebRequest request) {
        log.error("[api-error] 503 data access path={} message={} type={} rootCause={}", 
                extractPath(request), ex.getMessage(), ex.getClass().getSimpleName(),
                ex.getRootCause() != null ? ex.getRootCause().getMessage() : "Unknown", ex);
        
        String userMessage = "Database is temporarily unavailable. Please try again later.";
        if (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("timeout")) {
            userMessage = "Database query timeout. Please try again.";
        }
        if (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("connection")) {
            userMessage = "Database connection pool exhausted or database unreachable. Please retry in a moment.";
        }
        
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(errorBody(HttpStatus.SERVICE_UNAVAILABLE, userMessage, request, null));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException ex, WebRequest request) {
        log.warn("[api-error] 404 path={} message={}", extractPath(request), ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorBody(HttpStatus.NOT_FOUND, "Resource not found", request, null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex, WebRequest request) {
        log.error("[api-error] 500 unexpected path={} type={} message={}",
                extractPath(request), ex.getClass().getSimpleName(), ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorBody(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error", request, null));
    }

    private Map<String, Object> errorBody(HttpStatus status, String message, WebRequest request, Object details) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("path", extractPath(request));
        if (details != null) {
            body.put("details", details);
        }
        return body;
    }

    private String extractPath(WebRequest request) {
        return request.getDescription(false).replace("uri=", "");
    }
}
