package com.med.cognitive.controller;

import com.med.cognitive.dto.PatientOptionDto;
import com.med.cognitive.entity.Recommendation;
import com.med.cognitive.entity.enums.RecommendStatus;
import com.med.cognitive.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST pour la gestion des recommandations médicales.
 * Base URL : /api/recommendations
 */
@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RecommendationController {

    private final RecommendationService service;

    // ═══════════════════════════════════════════════════════════
    //  ENDPOINTS DE LECTURE
    // ═══════════════════════════════════════════════════════════

    /** Récupère une recommandation par son ID */
    @GetMapping("/{id}")
    public ResponseEntity<Recommendation> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    /**
     * Récupère toutes les recommandations créées par un médecin.
     * Utilisé pour le tableau de bord du médecin.
     * GET /api/recommendations/clinician/{clinicianId}
     */
    @GetMapping("/clinician/{clinicianId}")
    public ResponseEntity<List<Recommendation>> getByClinician(@PathVariable Long clinicianId) {
        return ResponseEntity.ok(service.getByClinicianId(clinicianId));
    }

    /**
     * Récupère toutes les recommandations d'un patient.
     * Utilisé pour la vue patient et aidant.
     * GET /api/recommendations/patient/{patientId}
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Recommendation>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(service.getByPatientId(patientId));
    }

    /**
     * Récupère les recommandations à destination de l'aidant pour un patient.
     * GET /api/recommendations/patient/{patientId}/caregiver
     */
    @GetMapping("/patient/{patientId}/caregiver")
    public ResponseEntity<List<Recommendation>> getCaregiverRecs(@PathVariable Long patientId) {
        return ResponseEntity.ok(service.getCaregiverRecommendationsByPatient(patientId));
    }

    /**
     * Récupère les recommandations filtrées par statut.
     * GET /api/recommendations/status/{status}
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Recommendation>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(service.getByStatus(RecommendStatus.valueOf(status)));
    }

    /**
     * Récupère les recommandations destinées à un rôle.
     * GET /api/recommendations/my-tasks?role=CAREGIVER
     */
    @GetMapping("/my-tasks")
    public ResponseEntity<List<Recommendation>> getMyTasks(@RequestParam("role") String role) {
        return ResponseEntity.ok(service.getByRole(role));
    }

    /**
     * Récupère la liste des patients d'un médecin, formatée pour le formulaire.
     * GET /api/recommendations/clinician/{clinicianId}/patients
     */
    @GetMapping("/clinician/{clinicianId}/patients")
    public ResponseEntity<List<PatientOptionDto>> getPatientsForClinician(@PathVariable Long clinicianId) {
        return ResponseEntity.ok(service.getPatientsForClinician(clinicianId));
    }

    // ═══════════════════════════════════════════════════════════
    //  ENDPOINTS D'ÉCRITURE
    // ═══════════════════════════════════════════════════════════

    /**
     * Crée une nouvelle recommandation.
     * POST /api/recommendations
     * Body : Recommendation JSON (action, priority, patientId, clinicianId, deadline…)
     */
    @PostMapping
    public ResponseEntity<Recommendation> create(@RequestBody Recommendation recommendation) {
        return ResponseEntity.ok(service.create(recommendation));
    }

    /**
     * Modifie une recommandation existante (champs partiels).
     * PUT /api/recommendations/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<Recommendation> update(
            @PathVariable Long id,
            @RequestBody Recommendation partial) {
        return ResponseEntity.ok(service.update(id, partial));
    }

    /**
     * Met à jour uniquement le statut d'une recommandation.
     * PATCH /api/recommendations/{id}/status?status=IN_PROGRESS&completedBy=42
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Recommendation> updateStatus(
            @PathVariable Long id,
            @RequestParam("status") String status,
            @RequestParam(value = "completedBy", required = false) Long completedBy) {
        return ResponseEntity.ok(service.updateStatus(id, RecommendStatus.valueOf(status), completedBy));
    }

    /**
     * Marque une recommandation comme complétée avec notes.
     * PATCH /api/recommendations/{id}/complete?notes=…&userId=42
     */
    @PatchMapping("/{id}/complete")
    public ResponseEntity<Recommendation> complete(
            @PathVariable Long id,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestParam("userId") Long userId) {
        return ResponseEntity.ok(service.markAsCompleted(id, notes, userId));
    }

    /**
     * Supprime une recommandation.
     * DELETE /api/recommendations/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
