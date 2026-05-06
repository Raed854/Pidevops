package MemorIA.controller;

import MemorIA.entity.Traitements.ZoneAutorisee;
import MemorIA.service.AuthorizedZoneService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/authorized-zones")
public class AuthorizedZoneController {

    private final AuthorizedZoneService authorizedZoneService;

    public AuthorizedZoneController(AuthorizedZoneService authorizedZoneService) {
        this.authorizedZoneService = authorizedZoneService;
    }

    // ── Request DTO ──────────────────────────────────────────────────────────
    // Used for POST/PUT to avoid @JsonBackReference blocking deserialization.

    public static class ZoneAutoriseeRequest {
        public String nom;
        public Double latitude;
        public Double longitude;
        public Integer rayon;
        public Boolean actif;
        public TraitementRef traitements;

        public static class TraitementRef {
            public Long idTraitement;
        }
    }

    // ── GET all ─────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<ZoneAutorisee>> getAllAuthorizedZones() {
        return ResponseEntity.ok(authorizedZoneService.getAllAuthorizedZones());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ZoneAutorisee> getAuthorizedZoneById(@PathVariable Long id) {
        Optional<ZoneAutorisee> zone = authorizedZoneService.getAuthorizedZoneById(id);
        return zone.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/traitement/{traitementId}")
    public ResponseEntity<List<ZoneAutorisee>> getAuthorizedZonesByTraitementId(@PathVariable Long traitementId) {
        return ResponseEntity.ok(authorizedZoneService.getAuthorizedZonesByTraitementId(traitementId));
    }

    @GetMapping("/active")
    public ResponseEntity<List<ZoneAutorisee>> getActiveAuthorizedZones() {
        return ResponseEntity.ok(authorizedZoneService.getActiveAuthorizedZones());
    }

    @GetMapping("/traitement/{traitementId}/active")
    public ResponseEntity<List<ZoneAutorisee>> getActiveAuthorizedZonesByTraitementId(@PathVariable Long traitementId) {
        return ResponseEntity.ok(authorizedZoneService.getActiveAuthorizedZonesByTraitementId(traitementId));
    }

    @GetMapping("/search/name/{nom}")
    public ResponseEntity<ZoneAutorisee> getAuthorizedZoneByName(@PathVariable String nom) {
        Optional<ZoneAutorisee> zone = authorizedZoneService.getAuthorizedZoneByName(nom);
        return zone.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    // Accepts a plain DTO so @JsonBackReference on ZoneAutorisee.traitements
    // does not prevent Jackson from reading idTraitement.

    @PostMapping
    public ResponseEntity<ZoneAutorisee> createAuthorizedZone(@RequestBody ZoneAutoriseeRequest req) {
        if (req.traitements == null || req.traitements.idTraitement == null) {
            return ResponseEntity.badRequest().build();
        }
        ZoneAutorisee created = authorizedZoneService.createFromRequest(
                req.nom, req.latitude, req.longitude,
                req.rayon, req.actif, req.traitements.idTraitement
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    public ResponseEntity<ZoneAutorisee> updateAuthorizedZone(
            @PathVariable Long id,
            @RequestBody ZoneAutoriseeRequest req) {
        Long idTraitement = req.traitements != null ? req.traitements.idTraitement : null;
        ZoneAutorisee updated = authorizedZoneService.updateFromRequest(
                id, req.nom, req.latitude, req.longitude,
                req.rayon, req.actif, idTraitement
        );
        return updated == null
                ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(updated);
    }

    // ── PATCH / DELETE ───────────────────────────────────────────────────────

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ZoneAutorisee> deactivateAuthorizedZone(@PathVariable Long id) {
        ZoneAutorisee deactivated = authorizedZoneService.deactivateAuthorizedZone(id);
        return deactivated == null
                ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(deactivated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAuthorizedZone(@PathVariable Long id) {
        authorizedZoneService.deleteAuthorizedZone(id);
        return ResponseEntity.noContent().build();
    }
}
