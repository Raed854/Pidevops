package MemorIA.controller;

import MemorIA.entity.Traitements.HistoriquePosition;
import MemorIA.service.LocationHistoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/location-history")
public class LocationHistoryController {

    @Autowired
    private LocationHistoryService locationHistoryService;

    @GetMapping
    public ResponseEntity<List<HistoriquePosition>> getAllLocationHistory() {
        return ResponseEntity.ok(locationHistoryService.getAllLocationHistory());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HistoriquePosition> getLocationHistoryById(@PathVariable Long id) {
        Optional<HistoriquePosition> h = locationHistoryService.getLocationHistoryById(id);
        return h.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/traitement/{traitementId}")
    public ResponseEntity<List<HistoriquePosition>> getByTraitement(@PathVariable Long traitementId) {
        return ResponseEntity.ok(locationHistoryService.getLocationHistoryByTraitementId(traitementId));
    }

    @GetMapping("/range")
    public ResponseEntity<List<HistoriquePosition>> getByDateRange(
            @RequestParam LocalDateTime startDate,
            @RequestParam LocalDateTime endDate) {
        return ResponseEntity.ok(locationHistoryService.getLocationHistoryByDateRange(startDate, endDate));
    }

    @GetMapping("/traitement/{traitementId}/range")
    public ResponseEntity<List<HistoriquePosition>> getByTraitementAndRange(
            @PathVariable Long traitementId,
            @RequestParam LocalDateTime startDate,
            @RequestParam LocalDateTime endDate) {
        return ResponseEntity.ok(
                locationHistoryService.getLocationHistoryByTraitementAndDateRange(traitementId, startDate, endDate));
    }

    @PostMapping
    public ResponseEntity<HistoriquePosition> createLocationHistory(@RequestBody HistoriquePosition locationHistory) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(locationHistoryService.createLocationHistory(locationHistory));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HistoriquePosition> updateLocationHistory(
            @PathVariable Long id, @RequestBody HistoriquePosition details) {
        HistoriquePosition updated = locationHistoryService.updateLocationHistory(id, details);
        return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLocationHistory(@PathVariable Long id) {
        locationHistoryService.deleteLocationHistory(id);
        return ResponseEntity.noContent().build();
    }
}
