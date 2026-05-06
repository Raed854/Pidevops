package MemorIA.controller;

import MemorIA.dto.DiagnosticStatisticsDTO;
import MemorIA.dto.DiagnosticSubmissionRequest;
import MemorIA.dto.DiagnosticSubmissionResponse;
import MemorIA.entity.diagnostic.Diagnostic;
import MemorIA.service.DiagnosticService;
import MemorIA.service.DiagnosticSubmissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/diagnostics")
public class DiagnosticController {

    private final DiagnosticService diagnosticService;
    private final DiagnosticSubmissionService submissionService;
    private final ObjectMapper objectMapper;

    public DiagnosticController(DiagnosticService diagnosticService,
                               DiagnosticSubmissionService submissionService,
                               ObjectMapper objectMapper) {
        this.diagnosticService = diagnosticService;
        this.submissionService = submissionService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ResponseEntity<List<Diagnostic>> getAllDiagnostics() {
        List<Diagnostic> diagnostics = diagnosticService.getAllDiagnostics();
        return ResponseEntity.ok(diagnostics);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Diagnostic> getDiagnosticById(@PathVariable Long id) {
        return diagnosticService.getDiagnosticById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Diagnostic> createDiagnostic(@RequestBody Diagnostic diagnostic) {
        Diagnostic savedDiagnostic = diagnosticService.saveDiagnostic(diagnostic);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedDiagnostic);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDiagnostic(@PathVariable Long id, @RequestBody Diagnostic diagnostic) {
        try {
            Diagnostic updatedDiagnostic = diagnosticService.updateDiagnostic(id, diagnostic);
            return ResponseEntity.ok(updatedDiagnostic);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            e.printStackTrace();
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Validates the rapport associated with a diagnostic.
     * Sets valideParMedecin = true on the rapport linked to this diagnostic.
     *
     * @param id The diagnostic ID
     * @return The updated diagnostic with the validated rapport
     */
    @PutMapping("/{id}/validate")
    public ResponseEntity<Diagnostic> validateRapport(@PathVariable Long id) {
        try {
            Diagnostic updatedDiagnostic = diagnosticService.validateRapportByDiagnosticId(id);
            return ResponseEntity.ok(updatedDiagnostic);
        } catch (RuntimeException e) {
            e.printStackTrace();
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDiagnostic(@PathVariable Long id) {
        diagnosticService.deleteDiagnostic(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Diagnostic>> getDiagnosticsByUserId(@PathVariable Long userId) {
        List<Diagnostic> diagnostics = diagnosticService.getDiagnosticsByUserId(userId);
        return ResponseEntity.ok(diagnostics);
    }

    @GetMapping("/user/{userId}/statistics")
    public ResponseEntity<DiagnosticStatisticsDTO> getStatisticsByUserId(@PathVariable Long userId) {
        DiagnosticStatisticsDTO stats = diagnosticService.getStatisticsByUserId(userId);
        return ResponseEntity.ok(stats);
    }

    /** Global statistics across all patients — for DOCTOR view */
    @GetMapping("/statistics")
    public ResponseEntity<DiagnosticStatisticsDTO> getGlobalStatistics() {
        DiagnosticStatisticsDTO stats = diagnosticService.getGlobalStatistics();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/risk-level/{riskLevel}")
    public ResponseEntity<List<Diagnostic>> getDiagnosticsByRiskLevel(@PathVariable String riskLevel) {
        List<Diagnostic> diagnostics = diagnosticService.getDiagnosticsByRiskLevel(riskLevel);
        return ResponseEntity.ok(diagnostics);
    }

    /**
     * Update ai_score for a diagnostic.
     * PUT /api/diagnostics/{id}/ai-score?aiScore=VALUE
     */
    @PutMapping("/{id}/ai-score")
    public ResponseEntity<?> updateAiScore(@PathVariable Long id,
                                           @RequestParam("aiScore") Double aiScore) {
        try {
            Diagnostic updated = diagnosticService.updateAiScore(id, aiScore);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    /**
     * Update etat_irm for a diagnostic.
     * PUT /api/diagnostics/{id}/etat-irm?etatIrm=VALUE
     */
    @PutMapping("/{id}/etat-irm")
    public ResponseEntity<?> updateEtatIrm(@PathVariable Long id,
                                            @RequestParam("etatIrm") String etatIrm) {
        try {
            Diagnostic updated = diagnosticService.updateEtatIrm(id, etatIrm);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    /**
     * Upload an image (e.g. IRM scan) for a diagnostic.
     * POST /api/diagnostics/{id}/image
     * Content-Type: multipart/form-data
     */
    @PostMapping("/{id}/image")
    public ResponseEntity<?> uploadImage(@PathVariable Long id,
                                         @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("File is empty");
            }
            Diagnostic updated = diagnosticService.uploadImage(id, file);
            // Use HashMap to safely handle null imageName / imageType
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("message", "Image uploaded successfully");
            response.put("diagnosticId", updated.getIdDiagnostic());
            response.put("imageName", updated.getImageName());
            response.put("imageType", updated.getImageType());
            return ResponseEntity.ok().body(response);
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to upload image: " + e.getMessage());
        }
    }

    /**
     * Retrieve the image for a diagnostic.
     * GET /api/diagnostics/{id}/image
     * Returns the raw image bytes with proper Content-Type.
     */
    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> getImage(@PathVariable Long id) {
        try {
            Diagnostic diagnostic = diagnosticService.getImageData(id);
            MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
            if (diagnostic.getImageType() != null) {
                try {
                    mediaType = MediaType.parseMediaType(diagnostic.getImageType());
                } catch (Exception ignored) {}
            }
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + diagnostic.getImageName() + "\"")
                    .body(diagnostic.getImage());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Soumet un diagnostic complet avec toutes les réponses du patient
     * Crée automatiquement le diagnostic et calcule les scores
     * 
     * @param request Contient userId, titre, et liste des réponses avec temps de réponse
     * @return Le diagnostic créé avec tous les scores calculés
     */
    @PostMapping("/submit")
    public ResponseEntity<DiagnosticSubmissionResponse> submitDiagnostic(
            @RequestBody DiagnosticSubmissionRequest request) {
        try {
            DiagnosticSubmissionResponse response = submissionService.submitDiagnostic(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Soumet un diagnostic complet avec image IRM optionnelle en une seule requête multipart.
     * POST /api/diagnostics/submit-with-image
     * Content-Type: multipart/form-data
     *   - data: JSON string (DiagnosticSubmissionRequest)
     *   - file: (optional) image file
     */
    @PostMapping(value = "/submit-with-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DiagnosticSubmissionResponse> submitDiagnosticWithImage(
            @RequestPart("data") String jsonData,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        try {
            DiagnosticSubmissionRequest request = objectMapper.readValue(jsonData, DiagnosticSubmissionRequest.class);
            DiagnosticSubmissionResponse response = submissionService.submitDiagnostic(request);

            if (file != null && !file.isEmpty()) {
                Long diagnosticId = response.getDiagnostic().getIdDiagnostic();
                Diagnostic updated = diagnosticService.uploadImage(diagnosticId, file);
                response.setDiagnostic(updated);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
