package MemorIA.controller;

import MemorIA.entity.Traitements.Traitements;
import MemorIA.entity.Traitements.TraitementAffectation;
import MemorIA.entity.Traitements.StatutAffectation;
import MemorIA.dto.TreatmentCreateRequest;
import MemorIA.dto.PatientNameDto;
import MemorIA.service.TreatmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/treatments")
public class TreatmentController {

    @Autowired
    private TreatmentService treatmentService;

    /**
     * GET /api/treatments - Récupère tous les traitements
     */
    @GetMapping
    public ResponseEntity<List<Traitements>> getAllTreatments() {
        List<Traitements> treatments = treatmentService.getAllTreatments();
        return ResponseEntity.ok(treatments);
    }

    /**
     * GET /api/treatments/{id} - Récupère un traitement par son ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Traitements> getTreatmentById(@PathVariable Long id) {
        Optional<Traitements> treatment = treatmentService.getTreatmentById(id);
        return treatment.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * GET /api/treatments/patient/{patientId} - Récupère les traitements d'un patient
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<TraitementAffectation>> getTreatmentsByPatient(@PathVariable Long patientId) {
        List<TraitementAffectation> affectations = treatmentService.getTreatmentsByPatient(patientId);
        return ResponseEntity.ok(affectations);
    }

    /**
     * GET /api/treatments/accompagnant/{accompagnantId} - Récupère les affectations d'un accompagnant
     */
    @GetMapping("/accompagnant/{accompagnantId}")
    public ResponseEntity<List<TraitementAffectation>> getTreatmentsByAccompagnant(@PathVariable Long accompagnantId) {
        List<TraitementAffectation> affectations = treatmentService.getTreatmentsByAccompagnant(accompagnantId);
        return ResponseEntity.ok(affectations);
    }

    /**
     * GET /api/treatments/accompagnant/{accompagnantId}/patients/names - Récupère les noms des patients affectés à un accompagnant
     */
    @GetMapping("/accompagnant/{accompagnantId}/patients/names")
    public ResponseEntity<List<PatientNameDto>> getPatientsNamesForAccompagnant(@PathVariable Long accompagnantId) {
        List<PatientNameDto> patients = treatmentService.getPatientsNamesForAccompagnant(accompagnantId);
        return ResponseEntity.ok(patients);
    }

    /**
     * GET /api/treatments/search/title/{titre} - Recherche un traitement par titre
     */
    @GetMapping("/search/title/{titre}")
    public ResponseEntity<Traitements> getTreatmentByTitle(@PathVariable String titre) {
        Optional<Traitements> treatment = treatmentService.getTreatmentByTitle(titre);
        return treatment.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * GET /api/treatments/active - Récupère les traitements avec alertes actives
     */
    @GetMapping("/active")
    public ResponseEntity<List<Traitements>> getActiveTreatments() {
        List<Traitements> treatments = treatmentService.getActiveTreatments();
        return ResponseEntity.ok(treatments);
    }

    /**
     * GET /api/treatments/alert-type/{typeAlerte} - Récupère les traitements par type d'alerte
     */
    @GetMapping("/alert-type/{typeAlerte}")
    public ResponseEntity<List<Traitements>> getTreatmentsByAlertType(@PathVariable String typeAlerte) {
        List<Traitements> treatments = treatmentService.getTreatmentsByAlertType(typeAlerte);
        return ResponseEntity.ok(treatments);
    }

    /**
     * POST /api/treatments - Crée un nouveau traitement
     */
    @PostMapping
    public ResponseEntity<Traitements> createTreatment(@Valid @RequestBody TreatmentCreateRequest request) {
        Traitements treatment = new Traitements();
        treatment.setTitre(request.getTitre());
        treatment.setAlerteActive(request.getAlerteActive() != null ? request.getAlerteActive() : false);
        treatment.setTypeAlerte(request.getTypeAlerte());

        Traitements createdTreatment = treatmentService.createTreatment(treatment);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdTreatment);
    }

    /**
     * POST /api/treatments/patient-accompagnant - Crée un traitement avec patient + accompagnant
     */
    @PostMapping("/patient-accompagnant")
    public ResponseEntity<TraitementAffectation> createTreatmentForPatient(
            @RequestParam Long treatmentId,
            @RequestParam Long patientId,
            @RequestParam(required = false) Long accompagnantId,
            @RequestParam(required = false) String dateFinPrevueStr,
            @RequestParam(required = false) String notes) {

        LocalDateTime dateFinPrevue = null;
        if (dateFinPrevueStr != null && !dateFinPrevueStr.isEmpty()) {
            dateFinPrevue = LocalDateTime.parse(dateFinPrevueStr);
        }

        TraitementAffectation affectation = treatmentService.createTreatmentForPatient(
                treatmentId,
                patientId,
                accompagnantId,
                dateFinPrevue,
                notes);

        return ResponseEntity.status(HttpStatus.CREATED).body(affectation);
    }

    /**
     * PUT /api/treatments/{id} - Met à jour un traitement existant
     */
    @PutMapping("/{id}")
    public ResponseEntity<Traitements> updateTreatment(
            @PathVariable Long id,
            @RequestBody Traitements treatmentDetails) {
        Traitements updatedTreatment = treatmentService.updateTreatment(id, treatmentDetails);
        if (updatedTreatment == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updatedTreatment);
    }

    /**
     * PATCH /api/treatments/affectation/{affectationId}/status - Met à jour le statut d'une affectation
     */
    @PatchMapping("/affectation/{affectationId}/status")
    public ResponseEntity<TraitementAffectation> updateAffectationStatus(
            @PathVariable Long affectationId,
            @RequestParam StatutAffectation statut) {
        TraitementAffectation updatedAffectation = treatmentService.updateAffectationStatus(affectationId, statut);
        if (updatedAffectation == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updatedAffectation);
    }

    /**
     * DELETE /api/treatments/{id} - Supprime un traitement
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTreatment(@PathVariable Long id) {
        treatmentService.deleteTreatment(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/treatments/affectation/{affectationId} - Supprime une affectation
     */
    @DeleteMapping("/affectation/{affectationId}")
    public ResponseEntity<Void> deleteAffectation(@PathVariable Long affectationId) {
        treatmentService.deleteAffectation(affectationId);
        return ResponseEntity.noContent().build();
    }
}
