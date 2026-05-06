package MemorIA.service;

import MemorIA.dto.DiagnosticStatisticsDTO;
import MemorIA.entity.User;
import MemorIA.entity.diagnostic.Diagnostic;
import MemorIA.entity.diagnostic.Rapport;
import MemorIA.repository.DiagnosticRepository;
import MemorIA.repository.RapportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DiagnosticServiceTest {

    @Mock
    private DiagnosticRepository diagnosticRepository;

    @Mock
    private RapportRepository rapportRepository;

    @Mock
    private AiService aiService;

    @InjectMocks
    private DiagnosticService diagnosticService;

    private Diagnostic diagnostic;
    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setNom("Doe");
        user.setPrenom("John");

        diagnostic = new Diagnostic();
        diagnostic.setIdDiagnostic(1L);
        diagnostic.setTitre("Diag 1");
        diagnostic.setUser(user);
        diagnostic.setAiScore(80.0);
        diagnostic.setRiskLevel("LOW");
        diagnostic.setPourcentageAlzeimer(20.0);
    }

    @Test
    @DisplayName("getAllDiagnostics: returns all diagnostics")
    void getAllDiagnostics_returnsAll() {
        when(diagnosticRepository.findAll()).thenReturn(List.of(diagnostic));

        List<Diagnostic> result = diagnosticService.getAllDiagnostics();

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getDiagnosticById: returns Optional from repository")
    void getDiagnosticById_returnsOptional() {
        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));

        Optional<Diagnostic> result = diagnosticService.getDiagnosticById(1L);

        assertTrue(result.isPresent());
    }

    @Test
    @DisplayName("saveDiagnostic: persists diagnostic via repository")
    void saveDiagnostic_persists() {
        when(diagnosticRepository.save(diagnostic)).thenReturn(diagnostic);

        Diagnostic result = diagnosticService.saveDiagnostic(diagnostic);

        assertEquals(diagnostic, result);
    }

    @Test
    @DisplayName("updateDiagnostic: applies partial null-safe update")
    void updateDiagnostic_partialUpdate() {
        Diagnostic updates = new Diagnostic();
        updates.setTitre("Updated Title");
        updates.setAiScore(90.0);
        // dateDebut left null → must not overwrite

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(diagnosticRepository.save(any(Diagnostic.class))).thenAnswer(inv -> inv.getArgument(0));

        Diagnostic result = diagnosticService.updateDiagnostic(1L, updates);

        assertEquals("Updated Title", result.getTitre());
        assertEquals(90.0, result.getAiScore());
        // Original riskLevel preserved
        assertEquals("LOW", result.getRiskLevel());
    }

    @Test
    @DisplayName("updateDiagnostic: rejects blank titre")
    void updateDiagnostic_rejectsBlankTitre() {
        Diagnostic updates = new Diagnostic();
        updates.setTitre("   ");

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));

        assertThrows(IllegalArgumentException.class,
                () -> diagnosticService.updateDiagnostic(1L, updates));
    }

    @Test
    @DisplayName("updateDiagnostic: rejects titre longer than 255 chars")
    void updateDiagnostic_rejectsLongTitre() {
        Diagnostic updates = new Diagnostic();
        updates.setTitre("x".repeat(256));

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));

        assertThrows(IllegalArgumentException.class,
                () -> diagnosticService.updateDiagnostic(1L, updates));
    }

    @Test
    @DisplayName("updateDiagnostic: throws when diagnostic missing")
    void updateDiagnostic_throwsWhenMissing() {
        when(diagnosticRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> diagnosticService.updateDiagnostic(404L, new Diagnostic()));
    }

    @Test
    @DisplayName("updateDiagnostic: validates rapport using top-level valideParMedecin field")
    void updateDiagnostic_validatesRapportTopLevel() {
        Rapport rapport = new Rapport();
        rapport.setIdRapport(7L);
        rapport.setValideParMedecin(false);
        diagnostic.setRapport(rapport);

        Diagnostic updates = new Diagnostic();
        updates.setValideParMedecin(true);

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(diagnosticRepository.save(any(Diagnostic.class))).thenAnswer(inv -> inv.getArgument(0));

        diagnosticService.updateDiagnostic(1L, updates);

        assertTrue(rapport.getValideParMedecin());
    }

    @Test
    @DisplayName("updateDiagnostic: falls back to loading rapport when not eagerly fetched")
    void updateDiagnostic_loadsRapportFallback() {
        // diagnostic has no rapport eagerly attached
        Rapport rapport = new Rapport();
        rapport.setIdRapport(7L);
        rapport.setValideParMedecin(false);

        Diagnostic updates = new Diagnostic();
        updates.setValideParMedecin(true);

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(diagnosticRepository.save(any(Diagnostic.class))).thenAnswer(inv -> inv.getArgument(0));
        when(rapportRepository.findByDiagnosticIdDiagnostic(1L)).thenReturn(Optional.of(rapport));

        diagnosticService.updateDiagnostic(1L, updates);

        assertTrue(rapport.getValideParMedecin());
        verify(rapportRepository).save(rapport);
    }

    @Test
    @DisplayName("validateRapportByDiagnosticId: sets validation flag and persists")
    void validateRapportByDiagnosticId_setsTrue() {
        Rapport rapport = new Rapport();
        rapport.setIdRapport(2L);
        rapport.setValideParMedecin(false);

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(rapportRepository.findByDiagnosticIdDiagnostic(1L)).thenReturn(Optional.of(rapport));

        diagnosticService.validateRapportByDiagnosticId(1L);

        assertTrue(rapport.getValideParMedecin());
        verify(rapportRepository).save(rapport);
    }

    @Test
    @DisplayName("validateRapportByDiagnosticId: throws when rapport missing")
    void validateRapportByDiagnosticId_throwsWhenRapportMissing() {
        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(rapportRepository.findByDiagnosticIdDiagnostic(1L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> diagnosticService.validateRapportByDiagnosticId(1L));
    }

    @Test
    @DisplayName("deleteDiagnostic: delegates to repository")
    void deleteDiagnostic_delegates() {
        diagnosticService.deleteDiagnostic(1L);
        verify(diagnosticRepository).deleteById(1L);
    }

    @Test
    @DisplayName("getDiagnosticsByUserId: returns user diagnostics")
    void getDiagnosticsByUserId_returnsList() {
        when(diagnosticRepository.findByUserId(1L)).thenReturn(List.of(diagnostic));

        List<Diagnostic> result = diagnosticService.getDiagnosticsByUserId(1L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getStatisticsByUserId: returns zero stats when no diagnostics")
    void getStatisticsByUserId_emptyList() {
        when(diagnosticRepository.findByUserId(1L)).thenReturn(List.of());

        DiagnosticStatisticsDTO stats = diagnosticService.getStatisticsByUserId(1L);

        assertEquals(0, stats.getTotalDiagnostics());
        assertEquals(0.0, stats.getAverageScore());
        assertEquals(0.0, stats.getHighestScore());
        assertEquals(0.0, stats.getLastScore());
        assertTrue(stats.getDiagnostics().isEmpty());
    }

    @Test
    @DisplayName("getStatisticsByUserId: computes averages and risk distribution")
    void getStatisticsByUserId_computesStats() {
        Diagnostic d1 = new Diagnostic();
        d1.setIdDiagnostic(1L);
        d1.setTitre("D1");
        d1.setUser(user);
        d1.setAiScore(80.0);
        d1.setRiskLevel("LOW");

        Diagnostic d2 = new Diagnostic();
        d2.setIdDiagnostic(2L);
        d2.setTitre("D2");
        d2.setUser(user);
        d2.setAiScore(40.0);
        d2.setRiskLevel("HIGH");

        when(diagnosticRepository.findByUserId(1L)).thenReturn(Arrays.asList(d1, d2));

        DiagnosticStatisticsDTO stats = diagnosticService.getStatisticsByUserId(1L);

        assertEquals(2, stats.getTotalDiagnostics());
        assertEquals(60.0, stats.getAverageScore());
        assertEquals(80.0, stats.getHighestScore());
        // Last entry's score
        assertEquals(40.0, stats.getLastScore());

        assertEquals(1L, stats.getCountByRiskLevel().get("LOW"));
        assertEquals(1L, stats.getCountByRiskLevel().get("HIGH"));
        assertEquals(0L, stats.getCountByRiskLevel().get("MEDIUM"));
        assertEquals(0L, stats.getCountByRiskLevel().get("CRITICAL"));

        assertEquals(50.0, stats.getPercentageByRiskLevel().get("LOW"));
        assertEquals(50.0, stats.getPercentageByRiskLevel().get("HIGH"));
    }

    @Test
    @DisplayName("getStatisticsByUserId: tolerates null aiScore values")
    void getStatisticsByUserId_handlesNullScores() {
        Diagnostic d = new Diagnostic();
        d.setIdDiagnostic(1L);
        d.setTitre("D");
        d.setUser(user);
        d.setAiScore(null);
        d.setRiskLevel("LOW");

        when(diagnosticRepository.findByUserId(1L)).thenReturn(List.of(d));

        DiagnosticStatisticsDTO stats = diagnosticService.getStatisticsByUserId(1L);

        assertEquals(1, stats.getTotalDiagnostics());
        assertEquals(0.0, stats.getAverageScore());
    }

    @Test
    @DisplayName("getGlobalStatistics: returns zero stats when repository is empty")
    void getGlobalStatistics_emptyList() {
        when(diagnosticRepository.findAll()).thenReturn(List.of());

        DiagnosticStatisticsDTO stats = diagnosticService.getGlobalStatistics();

        assertEquals(0, stats.getTotalDiagnostics());
    }

    @Test
    @DisplayName("getGlobalStatistics: aggregates across all diagnostics")
    void getGlobalStatistics_aggregates() {
        Diagnostic d1 = new Diagnostic();
        d1.setIdDiagnostic(1L);
        d1.setTitre("D1");
        d1.setUser(user);
        d1.setAiScore(100.0);
        d1.setRiskLevel("LOW");

        when(diagnosticRepository.findAll()).thenReturn(List.of(d1));

        DiagnosticStatisticsDTO stats = diagnosticService.getGlobalStatistics();

        assertEquals(1, stats.getTotalDiagnostics());
        assertEquals(100.0, stats.getAverageScore());
        assertEquals(100.0, stats.getHighestScore());
    }

    @Test
    @DisplayName("getDiagnosticsByRiskLevel: filters via repository")
    void getDiagnosticsByRiskLevel_filters() {
        when(diagnosticRepository.findByRiskLevel("HIGH")).thenReturn(List.of(diagnostic));

        List<Diagnostic> result = diagnosticService.getDiagnosticsByRiskLevel("HIGH");

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("updateAiScore: updates aiScore on the diagnostic")
    void updateAiScore_updates() {
        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(diagnosticRepository.save(any(Diagnostic.class))).thenAnswer(inv -> inv.getArgument(0));

        Diagnostic result = diagnosticService.updateAiScore(1L, 95.5);

        assertEquals(95.5, result.getAiScore());
    }

    @Test
    @DisplayName("updateEtatIrm: applies mild penalty (5%) and reduces aiScore")
    void updateEtatIrm_appliesMildPenalty() {
        diagnostic.setAiScore(80.0);
        diagnostic.setPourcentageAlzeimer(20.0);
        diagnostic.setEtatIrm(null);

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(diagnosticRepository.save(any(Diagnostic.class))).thenAnswer(inv -> inv.getArgument(0));

        Diagnostic result = diagnosticService.updateEtatIrm(1L, "mild impairment");

        assertEquals("mild impairment", result.getEtatIrm());
        assertEquals(75.0, result.getAiScore());
        assertEquals(25.0, result.getPourcentageAlzeimer());
    }

    @Test
    @DisplayName("updateEtatIrm: applies moderate penalty (10%)")
    void updateEtatIrm_appliesModeratePenalty() {
        diagnostic.setAiScore(80.0);
        diagnostic.setPourcentageAlzeimer(20.0);
        diagnostic.setEtatIrm(null);

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(diagnosticRepository.save(any(Diagnostic.class))).thenAnswer(inv -> inv.getArgument(0));

        Diagnostic result = diagnosticService.updateEtatIrm(1L, "moderate impairment");

        assertEquals(70.0, result.getAiScore());
        assertEquals(30.0, result.getPourcentageAlzeimer());
    }

    @Test
    @DisplayName("updateEtatIrm: does not double-count when changing penalty")
    void updateEtatIrm_replacesPenalty() {
        diagnostic.setAiScore(75.0);
        diagnostic.setPourcentageAlzeimer(25.0);
        diagnostic.setEtatIrm("mild impairment");

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(diagnosticRepository.save(any(Diagnostic.class))).thenAnswer(inv -> inv.getArgument(0));

        // mild → moderate: net change should be -5 on aiScore
        Diagnostic result = diagnosticService.updateEtatIrm(1L, "moderate impairment");

        assertEquals(70.0, result.getAiScore());
        assertEquals(30.0, result.getPourcentageAlzeimer());
    }

    @Test
    @DisplayName("updateEtatIrm: derives risk level from adjusted score")
    void updateEtatIrm_setsRiskLevel() {
        diagnostic.setAiScore(50.0);
        diagnostic.setPourcentageAlzeimer(50.0);
        diagnostic.setEtatIrm(null);

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(diagnosticRepository.save(any(Diagnostic.class))).thenAnswer(inv -> inv.getArgument(0));

        // After moderate: pourcentageAlzeimer becomes 60 → success rate = 40 → HIGH
        Diagnostic result = diagnosticService.updateEtatIrm(1L, "moderate impairment");

        assertEquals("HIGH", result.getRiskLevel());
    }

    @Test
    @DisplayName("uploadImage: stores image bytes and applies AI prediction")
    void uploadImage_storesAndApplies() throws IOException {
        diagnostic.setAiScore(80.0);
        diagnostic.setPourcentageAlzeimer(20.0);

        MultipartFile file = new MockMultipartFile(
                "image", "scan.jpg", "image/jpeg", new byte[]{1, 2, 3});

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(aiService.predictEtatIrm(any(byte[].class), anyString())).thenReturn("mild impairment");
        when(diagnosticRepository.save(any(Diagnostic.class))).thenAnswer(inv -> inv.getArgument(0));

        Diagnostic result = diagnosticService.uploadImage(1L, file);

        assertNotNull(result.getImage());
        assertEquals("scan.jpg", result.getImageName());
        assertEquals("image/jpeg", result.getImageType());
        assertEquals("mild impairment", result.getEtatIrm());
        assertEquals(75.0, result.getAiScore());
    }

    @Test
    @DisplayName("uploadImage: still saves image even when AI service returns null")
    void uploadImage_aiUnavailable() throws IOException {
        MultipartFile file = new MockMultipartFile(
                "image", "scan.jpg", "image/jpeg", new byte[]{1, 2, 3});

        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));
        when(aiService.predictEtatIrm(any(byte[].class), anyString())).thenReturn(null);
        when(diagnosticRepository.save(any(Diagnostic.class))).thenAnswer(inv -> inv.getArgument(0));

        Diagnostic result = diagnosticService.uploadImage(1L, file);

        assertNotNull(result.getImage());
        assertNull(result.getEtatIrm());
    }

    @Test
    @DisplayName("getImageData: returns diagnostic when image exists")
    void getImageData_returnsDiagnostic() {
        diagnostic.setImage(new byte[]{1, 2, 3});
        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));

        Diagnostic result = diagnosticService.getImageData(1L);

        assertNotNull(result.getImage());
    }

    @Test
    @DisplayName("getImageData: throws when no image stored")
    void getImageData_throwsWhenNoImage() {
        diagnostic.setImage(null);
        when(diagnosticRepository.findById(1L)).thenReturn(Optional.of(diagnostic));

        assertThrows(RuntimeException.class,
                () -> diagnosticService.getImageData(1L));
    }
}
