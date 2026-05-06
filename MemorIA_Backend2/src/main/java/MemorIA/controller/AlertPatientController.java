package MemorIA.controller;

import MemorIA.entity.Traitements.AlertPatient;
import MemorIA.service.AlertPatientService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@RestController
@RequestMapping("/api/alerts")
public class AlertPatientController {

    @Autowired
    private AlertPatientService alertPatientService;

    @GetMapping
    public ResponseEntity<List<AlertPatient>> getAllAlerts() {
        return ResponseEntity.ok(alertPatientService.getAllAlerts());
    }

    // Alerts for current user (patient view) — uses X-User-Id header
    @GetMapping("/me")
    public ResponseEntity<List<AlertPatient>> getMyAlerts(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(alertPatientService.getAlertsByPatientId(userId));
    }

    // List of patients linked to this caregiver (accompagnant)
    @GetMapping("/caregiver/patients-list")
    public ResponseEntity<List<Map<String, Object>>> getCaregiverPatients(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(alertPatientService.getPatientsForAccompagnant(userId));
    }

    // Alerts for a specific patient seen by the caregiver
    @GetMapping("/caregiver/patients/{patientId}/alerts")
    public ResponseEntity<List<AlertPatient>> getCaregiverPatientAlerts(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable Long patientId) {
        if (userId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(alertPatientService.getAlertsByAccompagnantAndPatient(userId, patientId));
    }

    // KPI for a specific patient (caregiver view)
    @GetMapping("/caregiver/patients/{patientId}/kpi")
    public ResponseEntity<Map<String, Object>> getCaregiverPatientKpi(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable Long patientId) {
        List<AlertPatient> alerts = (userId != null)
                ? alertPatientService.getAlertsByAccompagnantAndPatient(userId, patientId)
                : Collections.emptyList();
        long unread = alerts.stream().filter(a -> !a.getLu()).count();
        Map<String, Object> kpi = new HashMap<>();
        kpi.put("alertsToday", alerts.size());
        kpi.put("criticalUnresolved", unread);
        kpi.put("responseRate", alerts.isEmpty() ? 0 : ((alerts.size() - unread) * 100 / alerts.size()));
        return ResponseEntity.ok(kpi);
    }

    // All alerts for a doctor (used by doctor-alertes component)
    @GetMapping("/doctor")
    public ResponseEntity<List<AlertPatient>> getAllAlertsForDoctor() {
        return ResponseEntity.ok(alertPatientService.getAllAlertsSorted());
    }

    // Alerts for a specific patient
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AlertPatient>> getAlertsByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(alertPatientService.getAlertsByPatientId(patientId));
    }

    // Dashboard data for a patient
    @GetMapping("/dashboard/{patientId}")
    public ResponseEntity<Map<String, Object>> getDashboard(@PathVariable Long patientId) {
        return ResponseEntity.ok(buildDashboard(patientId));
    }

    // Doctor dashboard for a patient (used by doctor-alertes component)
    @GetMapping("/doctor/dashboard/{patientId}")
    public ResponseEntity<Map<String, Object>> getDoctorDashboard(@PathVariable Long patientId) {
        Map<String, Object> dashboard = buildDashboard(patientId);
        List<AlertPatient> alerts = alertPatientService.getAlertsByPatientId(patientId);
        dashboard.put("alerts", alerts);
        dashboard.put("unresolvedAlerts", alerts.stream().filter(a -> !a.getLu()).count());
        dashboard.put("resolutionRate24h", 0);
        dashboard.put("resolutionRateOverall", alerts.isEmpty() ? 0 :
                (alerts.stream().filter(AlertPatient::getLu).count() * 100.0 / alerts.size()));
        return ResponseEntity.ok(dashboard);
    }

    // Weather endpoint - proxies to Open-Meteo API for Tunis
    @GetMapping("/weather/{city}")
    public ResponseEntity<Object> getWeather(@PathVariable String city) {
        try {
            String url = "https://api.open-meteo.com/v1/forecast?latitude=36.8065&longitude=10.1815"
                    + "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
                    + "&timezone=Africa/Tunis";
            RestTemplate restTemplate = new RestTemplate();
            Object response = restTemplate.getForObject(url, Object.class);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            Map<String, Object> current = new HashMap<>();
            current.put("temperature_2m", 24);
            current.put("relative_humidity_2m", 50);
            current.put("wind_speed_10m", 10);
            current.put("weather_code", 0);
            fallback.put("current", current);
            return ResponseEntity.ok(fallback);
        }
    }

    private Map<String, Object> buildDashboard(Long patientId) {
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("patientId", patientId);
        dashboard.put("weeklyEvolution", Collections.emptyList());
        dashboard.put("topTypes", Collections.emptyList());
        dashboard.put("resolutionRate", 0);
        dashboard.put("patientTrends", Collections.emptyList());
        return dashboard;
    }

    @GetMapping("/{id}")
    public ResponseEntity<AlertPatient> getAlertById(@PathVariable Long id) {
        Optional<AlertPatient> alert = alertPatientService.getAlertById(id);
        return alert.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Toutes les alertes d'un traitement (triées par date desc)
    @GetMapping("/traitement/{idTraitement}")
    public ResponseEntity<List<AlertPatient>> getAlertsByTraitement(@PathVariable Long idTraitement) {
        return ResponseEntity.ok(alertPatientService.getAlertsByTraitementSorted(idTraitement));
    }

    // Alertes non-lues d'un traitement (pour les notifications)
    @GetMapping("/traitement/{idTraitement}/unread")
    public ResponseEntity<List<AlertPatient>> getUnreadAlerts(@PathVariable Long idTraitement) {
        return ResponseEntity.ok(alertPatientService.getUnreadAlertsByTraitement(idTraitement));
    }

    // Nombre d'alertes non-lues (pour le badge notification)
    @GetMapping("/traitement/{idTraitement}/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable Long idTraitement) {
        long count = alertPatientService.countUnreadAlerts(idTraitement);
        return ResponseEntity.ok(Map.of("count", count));
    }

    // Marquer une alerte comme lue
    @PatchMapping("/{id}/read")
    public ResponseEntity<AlertPatient> markAsRead(@PathVariable Long id) {
        AlertPatient alert = alertPatientService.markAsRead(id);
        if (alert != null) {
            return ResponseEntity.ok(alert);
        }
        return ResponseEntity.notFound().build();
    }

    // Marquer toutes les alertes d'un traitement comme lues
    @PatchMapping("/traitement/{idTraitement}/read-all")
    public ResponseEntity<Void> markAllAsRead(@PathVariable Long idTraitement) {
        alertPatientService.markAllAsRead(idTraitement);
        return ResponseEntity.ok().build();
    }

    // Mark as read (frontend uses POST /{id}/mark-as-read)
    @PostMapping("/{id}/mark-as-read")
    public ResponseEntity<AlertPatient> markAsReadPost(@PathVariable Long id) {
        AlertPatient alert = alertPatientService.markAsRead(id);
        if (alert != null) {
            return ResponseEntity.ok(alert);
        }
        return ResponseEntity.notFound().build();
    }

    // Take in charge (frontend uses POST /{id}/take-in-charge)
    @PostMapping("/{id}/take-in-charge")
    public ResponseEntity<AlertPatient> takeInCharge(@PathVariable Long id) {
        AlertPatient alert = alertPatientService.markAsRead(id);
        if (alert != null) {
            return ResponseEntity.ok(alert);
        }
        return ResponseEntity.notFound().build();
    }

    // Resolve alert (frontend uses POST /{id}/resolve)
    @PostMapping("/{id}/resolve")
    public ResponseEntity<AlertPatient> resolveAlert(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        AlertPatient alert = alertPatientService.markAsRead(id);
        if (alert != null) {
            return ResponseEntity.ok(alert);
        }
        return ResponseEntity.notFound().build();
    }

    // Create manual alert (frontend uses POST /manual)
    @PostMapping("/manual")
    public ResponseEntity<Map<String, Object>> createManualAlert(@RequestBody Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>(payload);
        response.put("id", System.currentTimeMillis());
        response.put("status", "ACTIVE");
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<AlertPatient> createAlert(@RequestBody AlertPatient alert) {
        return ResponseEntity.ok(alertPatientService.createAlert(alert));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AlertPatient> updateAlert(@PathVariable Long id, @RequestBody AlertPatient alertDetails) {
        AlertPatient updatedAlert = alertPatientService.updateAlert(id, alertDetails);
        if (updatedAlert != null) {
            return ResponseEntity.ok(updatedAlert);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAlert(@PathVariable Long id) {
        if (alertPatientService.alertExists(id)) {
            alertPatientService.deleteAlert(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
