package MemorIA.controller;

import MemorIA.entity.diagnostic.Rapport;
import MemorIA.service.RapportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rapports")
public class RapportController {

    private final RapportService rapportService;

    public RapportController(RapportService rapportService) {
        this.rapportService = rapportService;
    }

    @GetMapping
    public ResponseEntity<List<Rapport>> getAllRapports() {
        List<Rapport> rapports = rapportService.getAllRapports();
        return ResponseEntity.ok(rapports);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Rapport> getRapportById(@PathVariable Long id) {
        try {
            return rapportService.getRapportById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    public ResponseEntity<Rapport> createRapport(@RequestBody Rapport rapport) {
        Rapport savedRapport = rapportService.saveRapport(rapport);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRapport);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Rapport> updateRapport(@PathVariable Long id, @RequestBody Rapport rapport) {
        try {
            Rapport updatedRapport = rapportService.updateRapport(id, rapport);
            return ResponseEntity.ok(updatedRapport);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRapport(@PathVariable Long id) {
        rapportService.deleteRapport(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/diagnostic/{idDiagnostic}")
    public ResponseEntity<Rapport> getRapportByDiagnosticId(@PathVariable Long idDiagnostic) {
        return rapportService.getRapportByDiagnosticId(idDiagnostic)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/validation/{valideParMedecin}")
    public ResponseEntity<List<Rapport>> getRapportsByValidationStatus(@PathVariable Boolean valideParMedecin) {
        List<Rapport> rapports = rapportService.getRapportsByValidationStatus(valideParMedecin);
        return ResponseEntity.ok(rapports);
    }

    /**
     * Valide un rapport par un médecin
     * @param id L'ID du rapport à valider
     * @return Le rapport validé
     */
    @PatchMapping("/{id}/validate")
    public ResponseEntity<Rapport> validateRapport(@PathVariable Long id) {
        try {
            Rapport rapport = rapportService.getRapportById(id)
                    .orElseThrow(() -> new RuntimeException("Rapport not found with id: " + id));
            
            rapport.setValideParMedecin(true);
            Rapport updatedRapport = rapportService.saveRapport(rapport);
            
            return ResponseEntity.ok(updatedRapport);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Invalide un rapport (retire la validation)
     * @param id L'ID du rapport à invalider
     * @return Le rapport invalidé
     */
    @PatchMapping("/{id}/invalidate")
    public ResponseEntity<Rapport> invalidateRapport(@PathVariable Long id) {
        try {
            Rapport rapport = rapportService.getRapportById(id)
                    .orElseThrow(() -> new RuntimeException("Rapport not found with id: " + id));
            
            rapport.setValideParMedecin(false);
            Rapport updatedRapport = rapportService.saveRapport(rapport);
            
            return ResponseEntity.ok(updatedRapport);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Récupère tous les rapports en attente de validation
     * @return Liste des rapports non validés
     */
    @GetMapping("/pending")
    public ResponseEntity<List<Rapport>> getPendingRapports() {
        List<Rapport> rapports = rapportService.getRapportsByValidationStatus(false);
        return ResponseEntity.ok(rapports);
    }

    /**
     * Récupère les rapports validés avec recherche par nom/prénom patient et tri par date.
     * @param search  Terme de recherche (nom ou prénom du patient) — optionnel
     * @param sortOrder Ordre du tri : "asc" ou "desc" (défaut : "desc")
     * @return Liste des rapports validés filtrés et triés
     */
    @GetMapping("/validated")
    public ResponseEntity<?> getValidatedRapports(
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {
        if (!sortOrder.equalsIgnoreCase("asc") && !sortOrder.equalsIgnoreCase("desc")) {
            return ResponseEntity.badRequest().body("sortOrder must be 'asc' or 'desc'");
        }
        List<Rapport> rapports = rapportService.getValidatedRapports(search, sortOrder);
        return ResponseEntity.ok(rapports);
    }

    /**
     * Recherche des rapports par nom et/ou prénom de l'utilisateur
     * @param nom Le nom de l'utilisateur (optionnel)
     * @param prenom Le prénom de l'utilisateur (optionnel)
     * @return Liste des rapports correspondants
     */
    @GetMapping("/search/user")
    public ResponseEntity<List<Rapport>> searchRapportsByUser(
            @RequestParam(required = false) String nom,
            @RequestParam(required = false) String prenom) {
        List<Rapport> rapports = rapportService.searchByUserNomAndPrenom(nom, prenom);
        return ResponseEntity.ok(rapports);
    }

    /**
     * Recherche des rapports par titre du diagnostic
     * @param titre Le titre du diagnostic
     * @return Liste des rapports correspondants
     */
    @GetMapping("/search/diagnostic")
    public ResponseEntity<List<Rapport>> searchRapportsByDiagnosticTitre(
            @RequestParam String titre) {
        List<Rapport> rapports = rapportService.searchByDiagnosticTitre(titre);
        return ResponseEntity.ok(rapports);
    }
}
