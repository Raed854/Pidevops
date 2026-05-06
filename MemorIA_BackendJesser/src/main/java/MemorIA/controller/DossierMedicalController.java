package MemorIA.controller;

import MemorIA.entity.DossierMedical;
import MemorIA.service.DossierMedicalService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dossiers-medicaux")
public class DossierMedicalController {

    private final DossierMedicalService service;

    public DossierMedicalController(DossierMedicalService service) {
        this.service = service;
    }

    // ─── GET all (admin / soignant only) ─────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<DossierMedical>> getAll(
            @RequestHeader("X-Requester-Id") Long requesterId) {
        return ResponseEntity.ok(service.getAll(requesterId));
    }

    // ─── GET by dossier ID ────────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<DossierMedical> getById(
            @PathVariable Long id,
            @RequestHeader("X-Requester-Id") Long requesterId) {
        return ResponseEntity.ok(service.getById(id, requesterId));
    }

    // ─── GET by patient ID ────────────────────────────────────────────────────
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<DossierMedical> getByPatientId(
            @PathVariable Long patientId,
            @RequestHeader("X-Requester-Id") Long requesterId) {
        return ResponseEntity.ok(service.getByPatientId(patientId, requesterId));
    }

    // ─── POST create (soignant / admin only) ──────────────────────────────────
    @PostMapping
    public ResponseEntity<DossierMedical> create(
            @RequestBody DossierMedical dossier,
            @RequestHeader("X-Requester-Id") Long requesterId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dossier, requesterId));
    }

    // ─── PUT full update (soignant / admin only) ──────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<DossierMedical> update(
            @PathVariable Long id,
            @RequestBody DossierMedical dossier,
            @RequestHeader("X-Requester-Id") Long requesterId) {
        return ResponseEntity.ok(service.update(id, dossier, requesterId));
    }

    // ─── PATCH update doctor notes only (soignant / admin only) ─────────────
    @PatchMapping("/{id}/notes")
    public ResponseEntity<DossierMedical> updateNotes(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @RequestHeader("X-Requester-Id") Long requesterId) {
        String notes = body.get("notesMedecin");
        if (notes == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le champ 'notesMedecin' est requis");
        }
        return ResponseEntity.ok(service.updateNotesMedecin(id, notes, requesterId));
    }

    // ─── DELETE (admin only) ──────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestHeader("X-Requester-Id") Long requesterId) {
        service.delete(id, requesterId);
        return ResponseEntity.noContent().build();
    }
}
