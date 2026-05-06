package MemorIA.controller;

import MemorIA.entity.Soignant;
import MemorIA.service.SoignantService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/soignants")
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class SoignantController {

    private final SoignantService service;

    public SoignantController(SoignantService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<Soignant>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Soignant> getById(@PathVariable Long id) {
        return service.getById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<Soignant> getProfileByUserId(@PathVariable Long userId) {
        try {
            return service.getById(userId)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<Soignant> create(@Valid @RequestBody Soignant s) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.save(s));
    }

    @PutMapping("/profile/{userId}")
    public ResponseEntity<?> upsertProfile(@PathVariable Long userId, @Valid @RequestBody Soignant s) {
        try {
            Soignant result = service.upsertProfile(userId, s);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            String errorMsg = e.getMessage() != null ? e.getMessage() : "Internal server error";
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la sauvegarde: " + errorMsg));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Soignant> update(@PathVariable Long id, @Valid @RequestBody Soignant s) {
        try {
            return ResponseEntity.ok(service.update(id, s));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
