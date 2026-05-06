package MemorIA.controller;

import MemorIA.entity.Patient;
import MemorIA.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService service;

    public PatientController(PatientService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<Patient>> getAll(){return ResponseEntity.ok(service.getAll());}

    @GetMapping("/{id}")
    public ResponseEntity<Patient> getById(@PathVariable Long id){
        return service.getById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<Patient> getProfileByUserId(@PathVariable Long userId){
        return service.getById(userId).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Patient> create(@Valid @RequestBody Patient p){
        return ResponseEntity.status(HttpStatus.CREATED).body(service.save(p));
    }

    @PutMapping("/profile/{userId}")
    public ResponseEntity<Patient> upsertProfile(@PathVariable Long userId, @Valid @RequestBody Patient p){
        return ResponseEntity.ok(service.upsertProfile(userId, p));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Patient> update(@PathVariable Long id, @Valid @RequestBody Patient p){
        try{return ResponseEntity.ok(service.update(id,p));}catch(RuntimeException e){return ResponseEntity.notFound().build();}
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id){service.delete(id); return ResponseEntity.noContent().build();}

    @PostMapping("/{id}/dossier-medical")
    public ResponseEntity<Patient> uploadDossierMedical(@PathVariable Long id,
                                                        @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le fichier est vide.");
        }

        Patient patient = service.getById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient introuvable"));

        try {
            Path uploadDir = Paths.get("uploads", "dossiers-medicals");
            Files.createDirectories(uploadDir);

            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "dossier.pdf";
            String cleanedName = originalName.replaceAll("[^a-zA-Z0-9\\.\\-_]", "_");
            String filename = "patient-" + id + "-" + System.currentTimeMillis() + "-" + cleanedName;

            Path target = uploadDir.resolve(filename);
            file.transferTo(target.toFile());

            patient.setDossierMedicalPath(target.toString());
            Patient saved = service.save(patient);

            return ResponseEntity.ok(saved);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur lors de l'enregistrement du dossier médical.", e);
        }
    }
}
