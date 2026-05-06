package MemorIA.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    /**
     * Root endpoint — démontre que le serveur est actif
     */
    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "application", "MemorIA Backend",
                "version", "0.0.1-SNAPSHOT",
                "message", "API Backend running. Check /api endpoints.",
                "docs", "Contact admin for API documentation"
        ));
    }

    /**
     * Health check endpoint (optionnel, pour monitoring)
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.status(HttpStatus.OK).body(
                Map.of("status", "UP", "timestamp", String.valueOf(System.currentTimeMillis()))
        );
    }
}
