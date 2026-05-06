package MemorIA.controller;

import MemorIA.entity.Seance;
import MemorIA.entity.StatutSeance;
import MemorIA.service.SeanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seances")
@RequiredArgsConstructor
public class SeanceController {

    private final SeanceService seanceService;
    private final MemorIA.repository.ActiviteRepository activiteRepository;

    @GetMapping(produces = "application/json")
    public ResponseEntity<List<Seance>> getAll() {
        return ResponseEntity.ok(seanceService.getAllSeances());
    }

    @GetMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<Seance> getById(@PathVariable Long id) {
        Seance seance = seanceService.getSeanceById(id);
        return seance != null ? ResponseEntity.ok(seance) : ResponseEntity.notFound().build();
    }

    @GetMapping(value = "/activite/{activiteId}", produces = "application/json")
    public ResponseEntity<List<Seance>> getByActivite(@PathVariable Long activiteId) {
        return ResponseEntity.ok(seanceService.getSeancesByActivite(activiteId));
    }

    @GetMapping(value = "/disponibles", produces = "application/json")
    public ResponseEntity<List<Seance>> getAvailable() {
        return ResponseEntity.ok(seanceService.getAvailableSeances());
    }

    @PostMapping(consumes = "application/json", produces = "application/json")
    public ResponseEntity<Seance> createSeance(@RequestBody Seance seance) {
        if (seance.getActivite() == null || seance.getActivite().getId() == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Une activité parente est requise.");
        }
        
        MemorIA.entity.Activite activite = activiteRepository.findById(seance.getActivite().getId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "Activité parente inexistante."));
        
        seance.setActivite(activite);
        seance.setStatut(StatutSeance.DISPONIBLE);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(seanceService.saveSeance(seance));
    }

    @PutMapping(value = "/{id}", consumes = "application/json", produces = "application/json")
    public ResponseEntity<Seance> updateSeance(@PathVariable Long id, @RequestBody Seance details) {
        Seance seance = seanceService.getSeanceById(id);
        if (seance == null) return ResponseEntity.notFound().build();
        
        seance.setDate(details.getDate());
        seance.setHeureDebut(details.getHeureDebut());
        seance.setHeureFin(details.getHeureFin());
        if (details.getStatut() != null) seance.setStatut(details.getStatut());
        
        return ResponseEntity.ok(seanceService.saveSeance(seance));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSeance(@PathVariable Long id) {
        seanceService.deleteSeance(id);
        return ResponseEntity.ok().build();
    }
}
