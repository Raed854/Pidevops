package MemorIA.service;

import MemorIA.dto.DiagnosticStatisticsDTO;
import MemorIA.entity.diagnostic.Diagnostic;
import MemorIA.entity.diagnostic.Rapport;
import MemorIA.repository.DiagnosticRepository;
import MemorIA.repository.RapportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DiagnosticService {

    private final DiagnosticRepository diagnosticRepository;
    private final RapportRepository rapportRepository;
    private final AiService aiService;

    public DiagnosticService(DiagnosticRepository diagnosticRepository,
                             RapportRepository rapportRepository,
                             AiService aiService) {
        this.diagnosticRepository = diagnosticRepository;
        this.rapportRepository = rapportRepository;
        this.aiService = aiService;
    }

    @Transactional(readOnly = true)
    public List<Diagnostic> getAllDiagnostics() {
        List<Diagnostic> diagnostics = diagnosticRepository.findAll();
        diagnostics.forEach(this::initializeLazyCollections);
        return diagnostics;
    }

    @Transactional(readOnly = true)
    public Optional<Diagnostic> getDiagnosticById(Long id) {
        Optional<Diagnostic> diagnostic = diagnosticRepository.findById(id);
        diagnostic.ifPresent(this::initializeLazyCollections);
        return diagnostic;
    }

    public Diagnostic saveDiagnostic(Diagnostic diagnostic) {
        return diagnosticRepository.save(diagnostic);
    }

    @Transactional
    public Diagnostic updateDiagnostic(Long id, Diagnostic diagnosticDetails) {
        Diagnostic diagnostic = diagnosticRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Diagnostic not found with id: " + id));
        
        // Null-safe partial update: only overwrite fields that are provided
        if (diagnosticDetails.getTitre() != null) {
            String trimmedTitre = diagnosticDetails.getTitre().trim();
            if (trimmedTitre.isEmpty()) {
                throw new IllegalArgumentException("Titre must not be blank");
            }
            if (trimmedTitre.length() > 255) {
                throw new IllegalArgumentException("Titre must not exceed 255 characters");
            }
            diagnostic.setTitre(trimmedTitre);
        }
        if (diagnosticDetails.getDateDebut() != null) {
            diagnostic.setDateDebut(diagnosticDetails.getDateDebut());
        }
        if (diagnosticDetails.getDateFin() != null) {
            diagnostic.setDateFin(diagnosticDetails.getDateFin());
        }
        if (diagnosticDetails.getDureeMinutes() != null) {
            diagnostic.setDureeMinutes(diagnosticDetails.getDureeMinutes());
        }
        if (diagnosticDetails.getDateDiagnostic() != null) {
            diagnostic.setDateDiagnostic(diagnosticDetails.getDateDiagnostic());
        }
        if (diagnosticDetails.getRiskLevel() != null) {
            diagnostic.setRiskLevel(diagnosticDetails.getRiskLevel());
        }
        if (diagnosticDetails.getPourcentageAlzeimer() != null) {
            diagnostic.setPourcentageAlzeimer(diagnosticDetails.getPourcentageAlzeimer());
        }
        if (diagnosticDetails.getAiScore() != null) {
            diagnostic.setAiScore(diagnosticDetails.getAiScore());
        }

        // Determine if rapport validation was requested
        // Case 1: Frontend sends valideParMedecin as a top-level field on diagnostic
        // Case 2: Frontend sends it nested inside rapport object
        Boolean newValideParMedecin = null;
        if (diagnosticDetails.getValideParMedecin() != null) {
            newValideParMedecin = diagnosticDetails.getValideParMedecin();
        } else if (diagnosticDetails.getRapport() != null && diagnosticDetails.getRapport().getValideParMedecin() != null) {
            newValideParMedecin = diagnosticDetails.getRapport().getValideParMedecin();
        }

        // Update the rapport's valideParMedecin on the MANAGED entity to avoid cascade overwrite
        if (newValideParMedecin != null) {
            if (diagnostic.getRapport() != null) {
                // Update on the loaded entity so cascade persists the change
                diagnostic.getRapport().setValideParMedecin(newValideParMedecin);
            } else {
                // Fallback: load rapport separately if not eagerly fetched
                Rapport rapport = rapportRepository.findByDiagnosticIdDiagnostic(id).orElse(null);
                if (rapport != null) {
                    rapport.setValideParMedecin(newValideParMedecin);
                    rapportRepository.save(rapport);
                }
            }
        }
        
        Diagnostic saved = diagnosticRepository.save(diagnostic);
        initializeLazyCollections(saved);
        return saved;
    }

    /**
     * Validates the rapport associated with the given diagnostic ID.
     * Sets valideParMedecin = true on the rapport.
     */
    @Transactional
    public Diagnostic validateRapportByDiagnosticId(Long diagnosticId) {
        Diagnostic diagnostic = diagnosticRepository.findById(diagnosticId)
                .orElseThrow(() -> new RuntimeException("Diagnostic not found with id: " + diagnosticId));
        
        Rapport rapport = rapportRepository.findByDiagnosticIdDiagnostic(diagnosticId)
                .orElseThrow(() -> new RuntimeException("Rapport not found for diagnostic id: " + diagnosticId));
        
        rapport.setValideParMedecin(true);
        rapportRepository.save(rapport);
        
        // Refresh the diagnostic to include updated rapport
        Diagnostic updated = diagnosticRepository.findById(diagnosticId).orElse(diagnostic);
        initializeLazyCollections(updated);
        return updated;
    }

    public void deleteDiagnostic(Long id) {
        diagnosticRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<Diagnostic> getDiagnosticsByUserId(Long userId) {
        List<Diagnostic> diagnostics = diagnosticRepository.findByUserId(userId);
        diagnostics.forEach(this::initializeLazyCollections);
        return diagnostics;
    }

    @Transactional(readOnly = true)
    public DiagnosticStatisticsDTO getStatisticsByUserId(Long userId) {
        List<Diagnostic> diagnostics = diagnosticRepository.findByUserId(userId);

        DiagnosticStatisticsDTO stats = new DiagnosticStatisticsDTO();
        stats.setTotalDiagnostics(diagnostics.size());

        if (diagnostics.isEmpty()) {
            stats.setAverageScore(0);
            stats.setHighestScore(0);
            stats.setLastScore(0);
            stats.setDiagnostics(List.of());
            return stats;
        }

        // Calculate statistics from aiScore
        double total = diagnostics.stream()
                .mapToDouble(d -> d.getAiScore() != null ? d.getAiScore() : 0.0)
                .sum();
        double highest = diagnostics.stream()
                .mapToDouble(d -> d.getAiScore() != null ? d.getAiScore() : 0.0)
                .max().orElse(0.0);
        double last = diagnostics.get(diagnostics.size() - 1).getAiScore() != null
                ? diagnostics.get(diagnostics.size() - 1).getAiScore() : 0.0;

        stats.setAverageScore(Math.round(total / diagnostics.size() * 10.0) / 10.0);
        stats.setHighestScore(Math.round(highest * 10.0) / 10.0);
        stats.setLastScore(Math.round(last * 10.0) / 10.0);
        buildRiskStats(diagnostics, stats);
        stats.setDiagnostics(buildSummaries(diagnostics));
        return stats;
    }

    @Transactional(readOnly = true)
    public DiagnosticStatisticsDTO getGlobalStatistics() {
        List<Diagnostic> diagnostics = diagnosticRepository.findAll();
        diagnostics.forEach(this::initializeLazyCollections);

        DiagnosticStatisticsDTO stats = new DiagnosticStatisticsDTO();
        stats.setTotalDiagnostics(diagnostics.size());

        if (diagnostics.isEmpty()) {
            stats.setAverageScore(0);
            stats.setHighestScore(0);
            stats.setLastScore(0);
            stats.setDiagnostics(List.of());
            return stats;
        }

        double total = diagnostics.stream()
                .mapToDouble(d -> d.getAiScore() != null ? d.getAiScore() : 0.0)
                .sum();
        double highest = diagnostics.stream()
                .mapToDouble(d -> d.getAiScore() != null ? d.getAiScore() : 0.0)
                .max().orElse(0.0);
        double last = diagnostics.get(diagnostics.size() - 1).getAiScore() != null
                ? diagnostics.get(diagnostics.size() - 1).getAiScore() : 0.0;

        stats.setAverageScore(Math.round(total / diagnostics.size() * 10.0) / 10.0);
        stats.setHighestScore(Math.round(highest * 10.0) / 10.0);
        stats.setLastScore(Math.round(last * 10.0) / 10.0);
        buildRiskStats(diagnostics, stats);
        stats.setDiagnostics(buildSummaries(diagnostics));
        return stats;
    }

    /**
     * Fills countByRiskLevel and percentageByRiskLevel in the given stats object.
     * Risk levels are always returned in order: LOW, MEDIUM, HIGH, CRITICAL.
     */
    private void buildRiskStats(List<Diagnostic> diagnostics, DiagnosticStatisticsDTO stats) {
        int total = diagnostics.size();
        List<String> levels = List.of("LOW", "MEDIUM", "HIGH", "CRITICAL");

        Map<String, Long> counts = new LinkedHashMap<>();
        Map<String, Double> percentages = new LinkedHashMap<>();

        for (String level : levels) {
            long count = diagnostics.stream()
                    .filter(d -> level.equals(d.getRiskLevel()))
                    .count();
            double pct = total > 0
                    ? Math.round(count * 1000.0 / total) / 10.0  // 1 decimal place
                    : 0.0;
            counts.put(level, count);
            percentages.put(level, pct);
        }

        stats.setCountByRiskLevel(counts);
        stats.setPercentageByRiskLevel(percentages);
    }

    /** Shared helper: build lightweight summary list from a list of diagnostics. */
    private List<DiagnosticStatisticsDTO.DiagnosticSummary> buildSummaries(List<Diagnostic> diagnostics) {
        return diagnostics.stream()
                .map(d -> {
                    DiagnosticStatisticsDTO.DiagnosticSummary s = new DiagnosticStatisticsDTO.DiagnosticSummary();
                    s.setIdDiagnostic(d.getIdDiagnostic());
                    s.setTitre(d.getTitre());
                    s.setDateDiagnostic(d.getDateDiagnostic() != null ? d.getDateDiagnostic().toString() : null);
                    s.setAiScore(d.getAiScore());
                    s.setRiskLevel(d.getRiskLevel());
                    s.setPourcentageAlzeimer(d.getPourcentageAlzeimer());
                    if (d.getUser() != null) {
                        s.setPatientName(d.getUser().getPrenom() + " " + d.getUser().getNom());
                    }
                    return s;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Diagnostic> getDiagnosticsByRiskLevel(String riskLevel) {
        List<Diagnostic> diagnostics = diagnosticRepository.findByRiskLevel(riskLevel);
        diagnostics.forEach(this::initializeLazyCollections);
        return diagnostics;
    }

    /**
     * Returns the IRM penalty (%) to subtract from ai_score based on IRM state.
     * - no impairment            → 0%
     * - mild impairment (incl. very mild) → 5%
     * - moderate impairment      → 10%
     */
    private double getIrmPenalty(String etatIrm) {
        if (etatIrm == null) return 0.0;
        String normalized = etatIrm.toLowerCase()
                .replace("_", "").replace("-", "").replace(" ", "");
        if (normalized.contains("moderate")) return 10.0;
        if (normalized.contains("mild")) return 5.0;  // covers "mild" and "verymild"
        return 0.0; // "no impairment" / "NonDemented" or unknown
    }

    /**
     * Determines risk level based on cognitive test success rate (0–100).
     */
    private String determineRiskLevel(double pourcentageReussite) {
        if (pourcentageReussite >= 80.0) return "LOW";
        else if (pourcentageReussite >= 60.0) return "MEDIUM";
        else if (pourcentageReussite >= 40.0) return "HIGH";
        else return "CRITICAL";
    }

    /**
     * Applies the IRM penalty to pourcentageAlzeimer, aiScore and riskLevel.
     * Removes the old penalty and adds the new one to avoid double-counting
     * when IRM is updated more than once.
     * ai_score = response_score + maze_bonus - irm_penalty
     */
    private void applyIrmPenalty(Diagnostic diagnostic, String newEtatIrm) {
        double oldPenalty = getIrmPenalty(diagnostic.getEtatIrm());
        double newPenalty = getIrmPenalty(newEtatIrm);

        // Update pourcentageAlzeimer
        double base = diagnostic.getPourcentageAlzeimer() != null ? diagnostic.getPourcentageAlzeimer() : 0.0;
        double adjustedAlz = Math.min(100.0, Math.max(0.0, base - oldPenalty + newPenalty));
        diagnostic.setPourcentageAlzeimer(adjustedAlz);
        diagnostic.setRiskLevel(determineRiskLevel(100.0 - adjustedAlz));

        // Update aiScore: remove old IRM penalty and apply new one
        if (diagnostic.getAiScore() != null) {
            double adjustedAi = diagnostic.getAiScore() + oldPenalty - newPenalty;
            diagnostic.setAiScore(Math.min(100.0, Math.max(0.0, adjustedAi)));
        }
    }

    /**
     * Update the ai_score field for a diagnostic.
     * PUT /api/diagnostics/{id}/ai-score?aiScore=VALUE
     */
    @Transactional
    public Diagnostic updateAiScore(Long diagnosticId, Double aiScore) {
        Diagnostic diagnostic = diagnosticRepository.findById(diagnosticId)
                .orElseThrow(() -> new RuntimeException("Diagnostic not found with id: " + diagnosticId));
        diagnostic.setAiScore(aiScore);
        Diagnostic saved = diagnosticRepository.save(diagnostic);
        initializeLazyCollections(saved);
        return saved;
    }

    /**
     * Update the etat_irm field for a diagnostic and recalculate the Alzheimer score.
     */
    @Transactional
    public Diagnostic updateEtatIrm(Long diagnosticId, String etatIrm) {
        Diagnostic diagnostic = diagnosticRepository.findById(diagnosticId)
                .orElseThrow(() -> new RuntimeException("Diagnostic not found with id: " + diagnosticId));
        applyIrmPenalty(diagnostic, etatIrm);
        diagnostic.setEtatIrm(etatIrm);
        Diagnostic saved = diagnosticRepository.save(diagnostic);
        initializeLazyCollections(saved);
        return saved;
    }

    /**
     * Upload an image (IRM) for a diagnostic, then automatically call
     * the Python AI service to predict and save etatIrm.
     * Also recalculates pourcentageAlzeimer and riskLevel based on the IRM result.
     */
    @Transactional
    public Diagnostic uploadImage(Long diagnosticId, MultipartFile file) throws IOException {
        Diagnostic diagnostic = diagnosticRepository.findById(diagnosticId)
                .orElseThrow(() -> new RuntimeException("Diagnostic not found with id: " + diagnosticId));

        byte[] imageBytes = file.getBytes();
        diagnostic.setImage(imageBytes);
        diagnostic.setImageName(file.getOriginalFilename());
        diagnostic.setImageType(file.getContentType());

        // Call Python AI service to predict etatIrm
        String etatIrm = aiService.predictEtatIrm(imageBytes, file.getOriginalFilename());
        if (etatIrm != null) {
            applyIrmPenalty(diagnostic, etatIrm);
            diagnostic.setEtatIrm(etatIrm);
        }

        Diagnostic saved = diagnosticRepository.save(diagnostic);
        initializeLazyCollections(saved);
        return saved;
    }

    /**
     * Retrieve the image bytes for a diagnostic.
     */
    @Transactional(readOnly = true)
    public Diagnostic getImageData(Long diagnosticId) {
        Diagnostic diagnostic = diagnosticRepository.findById(diagnosticId)
                .orElseThrow(() -> new RuntimeException("Diagnostic not found with id: " + diagnosticId));
        if (diagnostic.getImage() == null) {
            throw new RuntimeException("No image found for diagnostic id: " + diagnosticId);
        }
        return diagnostic;
    }

    /**
     * Force l'initialisation des collections LAZY pour éviter
     * LazyInitializationException lors de la sérialisation JSON
     * (spring.jpa.open-in-view=false)
     */
    private void initializeLazyCollections(Diagnostic diagnostic) {
        if (diagnostic.getPatientAnswers() != null) {
            diagnostic.getPatientAnswers().size();
        }
        if (diagnostic.getNotifications() != null) {
            diagnostic.getNotifications().size();
        }
        if (diagnostic.getRapport() != null && diagnostic.getRapport().getNotifications() != null) {
            diagnostic.getRapport().getNotifications().size();
        }
    }
}
