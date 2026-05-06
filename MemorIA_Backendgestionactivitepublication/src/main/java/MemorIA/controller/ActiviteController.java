package MemorIA.controller;

import MemorIA.dto.ActiviteDTO;
import MemorIA.entity.Activite;
import MemorIA.entity.User;
import MemorIA.service.ActiviteService;
import MemorIA.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/activites")
@RequiredArgsConstructor
public class ActiviteController {

    private final ActiviteService activiteService;
    private final UserRepository userRepository;

    @GetMapping(produces = "application/json")
    public ResponseEntity<List<ActiviteDTO>> getAllActivites() {
        return ResponseEntity.ok(activiteService.getAllActivites());
    }

    @GetMapping(value = "/soignant/{soignantId}", produces = "application/json")
    public ResponseEntity<List<ActiviteDTO>> getBySoignant(@PathVariable Long soignantId) {
        return ResponseEntity.ok(activiteService.getActivitesBySoignantId(soignantId));
    }

    @GetMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<ActiviteDTO> getById(@PathVariable Long id) {
        return activiteService.getActiviteById(id)
                .map(activite -> ResponseEntity.ok(activiteService.toDTO(activite)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = "application/json", produces = "application/json")
    public ResponseEntity<ActiviteDTO> createActivite(@RequestBody Activite activite) {
        try {
            if (activite == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Activity data is required");
            }
            
            if (activite.getTitre() == null || activite.getTitre().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Activity title (titre) is required");
            }
            
            if (activite.getSoignant() == null || activite.getSoignant().getId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Soignant ID is required");
            }
            
            Long soignantId = activite.getSoignant().getId();
            User soignant = userRepository.findById(soignantId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Soignant with ID " + soignantId + " not found"));
            
            activite.setSoignant(soignant);
            // Clear the ID if it's 0 (for new activities)
            if (activite.getId() != null && activite.getId() == 0) {
                activite.setId(null);
            }
            
            Activite saved = activiteService.saveActivite(activite);
            return ResponseEntity.status(HttpStatus.CREATED).body(activiteService.toDTO(saved));
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, 
                    "Error creating activity: " + e.getMessage());
        }
    }

    @PutMapping(value = "/{id}", consumes = "application/json", produces = "application/json")
    public ResponseEntity<ActiviteDTO> updateActivite(@PathVariable Long id, @RequestBody Activite details) {
        Activite activite = activiteService.getActiviteById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Activity not found"));

        if (details.getTitre() != null) activite.setTitre(details.getTitre());
        if (details.getDescription() != null) activite.setDescription(details.getDescription());
        if (details.getType() != null) activite.setType(details.getType());
        
        Activite updated = activiteService.saveActivite(activite);
        return ResponseEntity.ok(activiteService.toDTO(updated));
    }

    @PostMapping("/{id}/image")
    public ResponseEntity<ActiviteDTO> uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            Activite updated = activiteService.uploadImage(id, file);
            return ResponseEntity.ok(activiteService.toDTO(updated));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur lors de l'upload de l'image");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActivite(@PathVariable Long id) {
        activiteService.deleteActivite(id);
        return ResponseEntity.ok().build();
    }
}
