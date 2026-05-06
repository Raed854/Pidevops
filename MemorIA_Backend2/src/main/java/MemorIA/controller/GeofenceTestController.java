package MemorIA.controller;

import MemorIA.entity.Traitements.Traitements;
import MemorIA.service.GeofenceService;
import MemorIA.repository.TreatmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test/geofence")
public class GeofenceTestController {

    @Autowired
    private GeofenceService geofenceService;

    @Autowired
    private TreatmentRepository treatmentRepository;

    /**
     * Test: Simuler un patient hors zone et déclencher une alerte SMS
     * 
     * GET /api/test/geofence/trigger?traitementId=1&lat=36.806389&lon=10.192806
     */
    @GetMapping("/trigger")
    public ResponseEntity<Map<String, Object>> triggerAlert(
            @RequestParam Long traitementId,
            @RequestParam double lat,
            @RequestParam double lon) {

        Map<String, Object> response = new HashMap<>();

        Traitements traitement = treatmentRepository.findById(traitementId)
                .orElse(null);

        if (traitement == null) {
            response.put("success", false);
            response.put("message", "❌ Traitement non trouvé avec ID: " + traitementId);
            return ResponseEntity.badRequest().body(response);
        }

        try {
            geofenceService.checkGeofence(lat, lon, traitement);

            response.put("success", true);
            response.put("message", "✓ Alerte testée avec succès");
            response.put("traitement_id", traitementId);
            response.put("position", Map.of(
                    "latitude", lat,
                    "longitude", lon
            ));
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "❌ Erreur lors du test: " + e.getMessage());
            response.put("error_details", e.toString());

            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * GET /api/test/geofence/status
     * Vérifier que le service fonctionne
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "✓ Service Geofence actif");
        response.put("service", "GeofenceTestController");
        response.put("timestamp", System.currentTimeMillis());
        response.put("test_endpoint", "/api/test/geofence/trigger?traitementId=1&lat=36.806389&lon=10.192806");

        return ResponseEntity.ok(response);
    }
}
