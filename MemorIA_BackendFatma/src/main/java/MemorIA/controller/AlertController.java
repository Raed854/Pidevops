package MemorIA.controller;

import MemorIA.dto.AlertDTO;
import MemorIA.dto.AlertResponseDTO;
import MemorIA.service.AlertService;
import MemorIA.service.impl.CaregiverAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:4200"})
@Slf4j
public class AlertController {

    private final AlertService alertService;
    private final CaregiverAlertService caregiverAlertService;

    @GetMapping("/me")
    public ResponseEntity<List<AlertDTO>> getAlertForCurrentUser() {
        log.info("[AlertController] GET /me");
        Long userId = getCurrentUserId();
        String role = getCurrentUserRole();
        if (userId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        List<AlertDTO> alerts = alertService.getAlertsForCurrentUser(userId, role);
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/caregiver/patients")
    public ResponseEntity<List<AlertResponseDTO>> getAlertsForCaregiverPatients() {
        log.info("[AlertController] GET /caregiver/patients");
        Long caregiverId = getCurrentUserId();
        if (caregiverId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        List<AlertResponseDTO> alerts = caregiverAlertService.getAlertsForAllCaregiverPatients(caregiverId);
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/caregiver/patients-list")
    public ResponseEntity<List<java.util.Map<String, Object>>> getCaregiverPatients(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {
        log.info("[AlertController] GET /caregiver/patients-list - Getting patients for caregiver");
        
        Long caregiverId = null;
        if (userIdHeader != null) {
            try {
                caregiverId = Long.parseLong(userIdHeader);
            } catch (NumberFormatException e) {
                log.warn("Invalid X-User-Id header: {}", userIdHeader);
                return ResponseEntity.ok(Collections.emptyList());
            }
        }
        
        if (caregiverId == null) {
            log.warn("No X-User-Id header provided for caregiver");
            return ResponseEntity.ok(Collections.emptyList());
        }
        
        List<java.util.Map<String, Object>> patients = caregiverAlertService.getCaregiverPatients(caregiverId);
        return ResponseEntity.ok(patients);
    }

    @GetMapping("/doctor")
    public ResponseEntity<List<AlertDTO>> getAllAlertsForDoctor(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {
        log.info("[AlertController] GET /doctor - Getting all alerts for doctor");
        
        Long doctorId = null;
        if (userIdHeader != null) {
            try {
                doctorId = Long.parseLong(userIdHeader);
            } catch (NumberFormatException e) {
                log.warn("Invalid X-User-Id header: {}", userIdHeader);
                return ResponseEntity.ok(Collections.emptyList());
            }
        }
        
        if (doctorId == null) {
            log.warn("No X-User-Id header provided");
            return ResponseEntity.ok(Collections.emptyList());
        }
        
        List<AlertDTO> alerts = alertService.getAllAlertsForDoctor(doctorId);
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AlertDTO>> getPatientAlerts(@PathVariable Long patientId) {
        log.info("[AlertController] GET /patient/{}", patientId);
        List<AlertDTO> alerts = alertService.getAlertsForPatient(patientId);
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/{alertId}")
    public ResponseEntity<AlertDTO> getAlert(@PathVariable Long alertId) {
        log.info("[AlertController] GET /{}", alertId);
        AlertDTO alert = alertService.getAlertById(alertId);
        return ResponseEntity.ok(alert);
    }

    @GetMapping("/weather/{patientId}")
    public ResponseEntity<List<AlertDTO>> getWeatherAlerts(@PathVariable Long patientId) {
        log.info("[AlertController] GET /weather/{}", patientId);
        List<AlertDTO> alerts = alertService.getAlertsForPatient(patientId);
        return ResponseEntity.ok(alerts);
    }

    @PostMapping("/manual")
    public ResponseEntity<Object> createManualAlert(
            @RequestBody MemorIA.dto.ManualAlertRequestDTO request,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {
        log.info("[AlertController] POST /manual - Creating manual alert for patient {}", request.patientId());
        
        Long userId = null;
        String userRole = "CAREGIVER";
        
        if (userIdHeader != null) {
            try {
                userId = Long.parseLong(userIdHeader);
            } catch (NumberFormatException e) {
                log.warn("Invalid X-User-Id header: {}", userIdHeader);
                return ResponseEntity.badRequest().body("Invalid user ID");
            }
        }
        
        if (userRoleHeader != null) {
            userRole = userRoleHeader;
        }
        
        if (userId == null) {
            log.warn("No X-User-Id header provided");
            return ResponseEntity.status(401).body("User not authenticated");
        }
        
        try {
            MemorIA.entity.alerts.Alert alert = caregiverAlertService.createManualAlert(request, userId, userRole);
            
            // Mapper vers AlertResponseDTO pour la réponse
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("id", alert.getId());
            response.put("patient_id", alert.getPatient().getId());
            response.put("type", alert.getType());
            response.put("title", alert.getTitle());
            response.put("description", alert.getDescription());
            response.put("severity", alert.getSeverity());
            response.put("status", alert.getStatus());
            response.put("created_at", alert.getCreatedAt());
            response.put("read", alert.isRead());
            
            log.info("[AlertController] Manual alert created successfully: id={}", alert.getId());
            return ResponseEntity.status(201).body(response);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            log.error("[AlertController] Error creating manual alert: {}", e.getReason());
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (Exception e) {
            log.error("[AlertController] Unexpected error creating manual alert: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Error creating alert: " + e.getMessage());
        }
    }

    @PostMapping("/{alertId}/resolve")
    public ResponseEntity<Object> resolveAlert(
            @PathVariable Long alertId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {
        log.info("[AlertController] POST /{}/resolve", alertId);
        
        Long userId = null;
        String userRole = "CAREGIVER";
        
        if (userIdHeader != null) {
            try {
                userId = Long.parseLong(userIdHeader);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body("Invalid user ID");
            }
        }
        
        if (userRoleHeader != null) {
            userRole = userRoleHeader;
        }
        
        if (userId == null) {
            return ResponseEntity.status(401).body("User not authenticated");
        }
        
        try {
            caregiverAlertService.resolveAlert(alertId, userId, userRole, null);
            
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("message", "Alert resolved successfully");
            response.put("alertId", alertId);
            
            return ResponseEntity.ok(response);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (Exception e) {
            log.error("[AlertController] Error resolving alert: {}", e.getMessage());
            return ResponseEntity.status(500).body("Error resolving alert");
        }
    }

    @PostMapping("/{alertId}/take-in-charge")
    public ResponseEntity<Object> takeInChargeAlert(
            @PathVariable Long alertId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {
        log.info("[AlertController] POST /{}/take-in-charge", alertId);
        
        Long userId = null;
        String userRole = "CAREGIVER";
        
        if (userIdHeader != null) {
            try {
                userId = Long.parseLong(userIdHeader);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body("Invalid user ID");
            }
        }
        
        if (userRoleHeader != null) {
            userRole = userRoleHeader;
        }
        
        if (userId == null) {
            return ResponseEntity.status(401).body("User not authenticated");
        }
        
        try {
            caregiverAlertService.takeInChargeAlert(alertId, userId, userRole);
            
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("message", "Alert taken in charge");
            response.put("alertId", alertId);
            
            return ResponseEntity.ok(response);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (Exception e) {
            log.error("[AlertController] Error taking in charge alert: {}", e.getMessage());
            return ResponseEntity.status(500).body("Error taking in charge alert");
        }
    }

    @GetMapping("/dashboard/{patientId}")
    public ResponseEntity<Object> getDashboard(@PathVariable Long patientId) {
        log.info("[AlertController] GET /dashboard/{}", patientId);
        List<AlertDTO> alerts = alertService.getAlertsForPatient(patientId);
        
        // Build a basic dashboard response
        java.util.Map<String, Object> dashboard = new java.util.HashMap<>();
        dashboard.put("patientId", patientId);
        dashboard.put("patientName", "Patient");
        dashboard.put("weeklyEvolution", java.util.Collections.emptyList());
        dashboard.put("topTypes", java.util.Collections.emptyList());
        dashboard.put("resolutionRate", 0.0);
        dashboard.put("patientTrends", java.util.Collections.emptyList());
        dashboard.put("alerts", alerts);
        
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/doctor/dashboard/{patientId}")
    public ResponseEntity<Object> getDoctorDashboard(@PathVariable Long patientId) {
        log.info("[AlertController] GET /doctor/dashboard/{}", patientId);
        List<AlertDTO> alerts = alertService.getAlertsForPatient(patientId);
        
        // Calculate unresolved count
        long unresolvedCount = alerts.stream()
            .filter(a -> !"RESOLVED".equals(a.status().toString()))
            .count();
        
        int totalAlerts = alerts.size();
        double resolutionRate = totalAlerts > 0 
            ? ((totalAlerts - unresolvedCount) / (double) totalAlerts) * 100 
            : 0.0;
        
        // Build doctor dashboard response
        java.util.Map<String, Object> doctorDashboard = new java.util.HashMap<>();
        doctorDashboard.put("patientId", patientId);
        doctorDashboard.put("patientName", "Patient");
        doctorDashboard.put("unresolvedAlerts", unresolvedCount);
        doctorDashboard.put("totalAlerts", totalAlerts);
        doctorDashboard.put("resolutionRate24h", resolutionRate);
        doctorDashboard.put("resolutionRateOverall", resolutionRate);
        doctorDashboard.put("alerts", alerts);
        
        return ResponseEntity.ok(doctorDashboard);
    }

    @GetMapping("/weather/tunis")
    public ResponseEntity<Object> getTunisWeather() {
        log.info("[AlertController] GET /weather/tunis - Fetching Tunis weather from Open-Meteo");
        
        try {
            String openMeteoUrl = "https://api.open-meteo.com/v1/forecast?" +
                    "latitude=36.8065&longitude=10.1686&" +
                    "current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&" +
                    "temperature_unit=celsius&wind_speed_unit=kmh&timezone=Africa/Tunis";
            
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            Object response = restTemplate.getForObject(openMeteoUrl, Object.class);
            
            log.info("[AlertController] Weather data received from Open-Meteo");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("[AlertController] Error fetching weather from Open-Meteo: {}", e.getMessage(), e);
            
            // Return default response
            java.util.Map<String, Object> defaultWeather = new java.util.HashMap<>();
            java.util.Map<String, Object> current = new java.util.HashMap<>();
            current.put("temperature_2m", 24);
            current.put("relative_humidity_2m", 50);
            current.put("weather_code", 0);
            current.put("wind_speed_10m", 10);
            defaultWeather.put("current", current);
            
            return ResponseEntity.ok(defaultWeather);
        }
    }

    @GetMapping("/caregiver/patients/{patientId}/alerts")
    public ResponseEntity<List<AlertResponseDTO>> getCaregiverPatientAlerts(
            @PathVariable Long patientId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {
        log.info("[AlertController] GET /caregiver/patients/{}/alerts", patientId);
        
        Long userId = null;
        String userRole = "CAREGIVER";
        
        if (userIdHeader != null) {
            try {
                userId = Long.parseLong(userIdHeader);
            } catch (NumberFormatException e) {
                log.warn("Invalid X-User-Id header: {}", userIdHeader);
                return ResponseEntity.ok(Collections.emptyList());
            }
        }
        
        if (userRoleHeader != null) {
            userRole = userRoleHeader;
        }
        
        if (userId == null) {
            log.warn("No X-User-Id header provided");
            return ResponseEntity.ok(Collections.emptyList());
        }
        
        try {
            List<AlertResponseDTO> alerts = caregiverAlertService.getAlertsForPatient(patientId, userId, userRole);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("[AlertController] Error getting alerts for patient: {}", e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @GetMapping("/caregiver/patients/{patientId}/kpi")
    public ResponseEntity<java.util.Map<String, Object>> getCaregiverPatientKpi(
            @PathVariable Long patientId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {
        log.info("[AlertController] GET /caregiver/patients/{}/kpi", patientId);
        
        Long userId = null;
        String userRole = "CAREGIVER";
        
        if (userIdHeader != null) {
            try {
                userId = Long.parseLong(userIdHeader);
            } catch (NumberFormatException e) {
                log.warn("Invalid X-User-Id header: {}", userIdHeader);
                return ResponseEntity.ok(buildDefaultKpi());
            }
        }
        
        if (userRoleHeader != null) {
            userRole = userRoleHeader;
        }
        
        if (userId == null) {
            log.warn("No X-User-Id header provided");
            return ResponseEntity.ok(buildDefaultKpi());
        }
        
        try {
            List<AlertResponseDTO> alerts = caregiverAlertService.getAlertsForPatient(patientId, userId, userRole);
            
            // Calculer les KPIs à partir des alertes
            long totalAlerts = alerts.size();
            long criticalAlerts = alerts.stream()
                .filter(a -> "CRITICAL".equalsIgnoreCase(a.getSeverity()))
                .count();
            long unresolvedAlerts = alerts.stream()
                .filter(a -> !"RESOLVED".equalsIgnoreCase(a.getStatus()))
                .count();
            long todayAlerts = alerts.stream()
                .filter(a -> {
                    java.time.LocalDateTime createdAt = a.getCreatedAt();
                    java.time.LocalDate today = java.time.LocalDate.now();
                    return createdAt.toLocalDate().equals(today);
                })
                .count();
            
            double responseRate = totalAlerts > 0 
                ? Math.round(((totalAlerts - unresolvedAlerts) / (double) totalAlerts) * 100)
                : 100.0;
            
            java.util.Map<String, Object> kpi = new java.util.HashMap<>();
            kpi.put("patientId", patientId);
            kpi.put("alertsToday", todayAlerts);
            kpi.put("criticalUnresolved", criticalAlerts);
            kpi.put("responseRate", responseRate);
            kpi.put("totalAlerts", totalAlerts);
            kpi.put("unresolvedAlerts", unresolvedAlerts);
            
            return ResponseEntity.ok(kpi);
        } catch (Exception e) {
            log.error("[AlertController] Error calculating KPI for patient: {}", e.getMessage());
            java.util.Map<String, Object> kpi = buildDefaultKpi();
            kpi.put("patientId", patientId);
            return ResponseEntity.ok(kpi);
        }
    }

    private java.util.Map<String, Object> buildDefaultKpi() {
        java.util.Map<String, Object> kpi = new java.util.HashMap<>();
        kpi.put("alertsToday", 0);
        kpi.put("criticalUnresolved", 0);
        kpi.put("responseRate", 0.0);
        kpi.put("totalAlerts", 0);
        kpi.put("unresolvedAlerts", 0);
        return kpi;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            try {
                return Long.parseLong(auth.getPrincipal().toString());
            } catch (Exception e) {
                log.warn("Could not parse userId from authentication");
            }
        }
        return null;
    }

    private String getCurrentUserRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return auth.getAuthorities().stream()
                .findFirst()
                .map(GrantedAuthority::getAuthority)
                .map(a -> a.replace("ROLE_", ""))
                .orElse("USER");
        }
        return "USER";
    }
}
