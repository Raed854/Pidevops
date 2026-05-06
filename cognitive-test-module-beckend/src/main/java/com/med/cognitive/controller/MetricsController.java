package com.med.cognitive.controller;

import com.med.cognitive.dto.*;
import com.med.cognitive.service.MetricsService;
import com.med.cognitive.service.SchedulerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MetricsController {

    private final MetricsService metricsService;
    private final SchedulerService schedulerService;

    // ── Aidant metrics ──────────────────────────────────────────────────────────

    @GetMapping("/aidant/{accompagnantId}")
    public ResponseEntity<AidantMetricsDto> getMetricsForAidant(@PathVariable Long accompagnantId) {
        return ResponseEntity.ok(metricsService.getMetricsForAidant(accompagnantId));
    }

    @GetMapping("/aidant/{aidantId}/score-global")
    public ResponseEntity<ScoreGlobalDTO> getScoreGlobalForAidant(@PathVariable Long aidantId) {
        return ResponseEntity.ok(metricsService.calculateGlobalScoreForAidant(aidantId));
    }

    // ── Feature 4 : Historique de progression ──────────────────────────────────

    /**
     * Points d'historique d'un patient (z-scores dans le temps).
     * GET /api/metrics/patient/{patientId}/historique?mois=6
     */
    @GetMapping("/patient/{patientId}/historique")
    public ResponseEntity<List<HistoriquePointDTO>> getHistorique(
            @PathVariable String patientId,
            @RequestParam(defaultValue = "6") int mois) {
        return ResponseEntity.ok(metricsService.getHistoriquePatient(patientId, mois));
    }

    // ── Feature 8 : Cohorte ─────────────────────────────────────────────────────

    /**
     * Résumé de tous les patients d'un médecin (analyse comparative).
     * GET /api/metrics/cohorte/medecin/{soignantId}
     */
    @GetMapping("/cohorte/medecin/{soignantId}")
    public ResponseEntity<List<PatientScoreResumeDTO>> getCohorteSummary(@PathVariable Long soignantId) {
        return ResponseEntity.ok(metricsService.getCohorteSummary(soignantId));
    }

    // ── Feature 7 : Trigger manuel ─────────────────────────────────────────────

    /**
     * Déclenche immédiatement la vérification des tests expirés.
     * POST /api/metrics/trigger-expired-check
     */
    @PostMapping("/trigger-expired-check")
    public ResponseEntity<Map<String, Object>> triggerExpiredCheck() {
        int count = schedulerService.triggerExpiredCheck();
        return ResponseEntity.ok(Map.of("markedExpired", count,
                "message", count + " test(s) marqué(s) EXPIRED"));
    }

    // ── Migration / utilitaires ─────────────────────────────────────────────────

    @PostMapping("/recalculate-zscores")
    public ResponseEntity<Map<String, Object>> recalculateAllZScores() {
        int updated = metricsService.recalculateZScoresForAllResults();
        return ResponseEntity.ok(Map.of("updatedCount", updated,
                "message", updated + " résultats mis à jour avec leur z-score"));
    }

    @GetMapping("/patients/{patientId}/mmse-score")
    public ResponseEntity<Map<String, Object>> getLatestMMSEScore(@PathVariable String patientId) {
        double score = metricsService.getLatestMMSEScoreForPatient(patientId);
        return ResponseEntity.ok(Map.of(
                "patientId", patientId,
                "mmseScore", score,
                "hasPassedTest", score > 0));
    }
}
