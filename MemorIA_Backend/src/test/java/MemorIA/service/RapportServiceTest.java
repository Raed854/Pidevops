package MemorIA.service;

import MemorIA.entity.diagnostic.Rapport;
import MemorIA.repository.RapportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RapportServiceTest {

    @Mock
    private RapportRepository rapportRepository;

    @InjectMocks
    private RapportService rapportService;

    private Rapport rapport;

    @BeforeEach
    void setUp() {
        rapport = new Rapport();
        rapport.setIdRapport(1L);
        rapport.setTitre("Rapport 1");
        rapport.setResumer("résumé");
        rapport.setAnalyseDetaillee("analyse");
        rapport.setValideParMedecin(false);
        rapport.setDateGeneration(LocalDateTime.now());
    }

    @Test
    @DisplayName("getAllRapports: returns all reports")
    void getAllRapports_returnsAll() {
        when(rapportRepository.findAll()).thenReturn(List.of(rapport));

        List<Rapport> result = rapportService.getAllRapports();

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getRapportById: returns Optional from repository")
    void getRapportById_returnsOptional() {
        when(rapportRepository.findById(1L)).thenReturn(Optional.of(rapport));

        Optional<Rapport> result = rapportService.getRapportById(1L);

        assertTrue(result.isPresent());
    }

    @Test
    @DisplayName("saveRapport: persists report via repository")
    void saveRapport_persists() {
        when(rapportRepository.save(rapport)).thenReturn(rapport);

        Rapport result = rapportService.saveRapport(rapport);

        assertEquals(rapport, result);
    }

    @Test
    @DisplayName("updateRapport: updates fields and saves")
    void updateRapport_updates() {
        Rapport updates = new Rapport();
        updates.setTitre("New Title");
        updates.setResumer("New Summary");
        updates.setAnalyseDetaillee("New Analysis");
        updates.setValideParMedecin(true);
        updates.setDateGeneration(LocalDateTime.now());

        when(rapportRepository.findById(1L)).thenReturn(Optional.of(rapport));
        when(rapportRepository.save(any(Rapport.class))).thenAnswer(inv -> inv.getArgument(0));

        Rapport result = rapportService.updateRapport(1L, updates);

        assertEquals("New Title", result.getTitre());
        assertEquals("New Summary", result.getResumer());
        assertTrue(result.getValideParMedecin());
    }

    @Test
    @DisplayName("updateRapport: throws when missing")
    void updateRapport_throwsWhenMissing() {
        when(rapportRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> rapportService.updateRapport(404L, new Rapport()));
    }

    @Test
    @DisplayName("deleteRapport: delegates to repository")
    void deleteRapport_delegates() {
        rapportService.deleteRapport(1L);
        verify(rapportRepository).deleteById(1L);
    }

    @Test
    @DisplayName("getRapportByDiagnosticId: returns Optional from repository")
    void getRapportByDiagnosticId_returnsOptional() {
        when(rapportRepository.findByDiagnosticIdDiagnostic(7L)).thenReturn(Optional.of(rapport));

        Optional<Rapport> result = rapportService.getRapportByDiagnosticId(7L);

        assertTrue(result.isPresent());
    }

    @Test
    @DisplayName("getRapportsByValidationStatus: filters by validation flag")
    void getRapportsByValidationStatus_filters() {
        when(rapportRepository.findByValideParMedecin(true)).thenReturn(List.of(rapport));

        List<Rapport> result = rapportService.getRapportsByValidationStatus(true);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("searchByUserNomAndPrenom: uses combined query when both nom and prenom provided")
    void searchByUserNomAndPrenom_combined() {
        when(rapportRepository.findByDiagnosticUserNomContainingIgnoreCaseAndDiagnosticUserPrenomContainingIgnoreCase(
                "Doe", "John")).thenReturn(List.of(rapport));

        List<Rapport> result = rapportService.searchByUserNomAndPrenom("Doe", "John");

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("searchByUserNomAndPrenom: uses nom-only query when prenom is empty")
    void searchByUserNomAndPrenom_nomOnly() {
        when(rapportRepository.findByDiagnosticUserNomContainingIgnoreCase("Doe"))
                .thenReturn(List.of(rapport));

        List<Rapport> result = rapportService.searchByUserNomAndPrenom("Doe", null);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("searchByUserNomAndPrenom: uses prenom-only query when nom is empty")
    void searchByUserNomAndPrenom_prenomOnly() {
        when(rapportRepository.findByDiagnosticUserPrenomContainingIgnoreCase("John"))
                .thenReturn(List.of(rapport));

        List<Rapport> result = rapportService.searchByUserNomAndPrenom("", "John");

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("searchByUserNomAndPrenom: returns all when both filters are empty")
    void searchByUserNomAndPrenom_returnsAllWhenEmpty() {
        when(rapportRepository.findAll()).thenReturn(List.of(rapport));

        List<Rapport> result = rapportService.searchByUserNomAndPrenom(null, null);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("searchByDiagnosticTitre: delegates to repository")
    void searchByDiagnosticTitre_delegates() {
        when(rapportRepository.findByDiagnosticTitreContainingIgnoreCase("test"))
                .thenReturn(List.of(rapport));

        List<Rapport> result = rapportService.searchByDiagnosticTitre("test");

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getValidatedRapports: returns all validated reports sorted descending by default")
    void getValidatedRapports_defaultSort() {
        ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
        when(rapportRepository.findByValideParMedecin(eq(true), any(Sort.class)))
                .thenReturn(List.of(rapport));

        List<Rapport> result = rapportService.getValidatedRapports(null, null);

        verify(rapportRepository).findByValideParMedecin(eq(true), sortCaptor.capture());
        assertTrue(sortCaptor.getValue().getOrderFor("dateGeneration").isDescending());
        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getValidatedRapports: ascending sort when sortOrder=asc")
    void getValidatedRapports_ascSort() {
        ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
        when(rapportRepository.findByValideParMedecin(eq(true), any(Sort.class)))
                .thenReturn(List.of());

        rapportService.getValidatedRapports("", "asc");

        verify(rapportRepository).findByValideParMedecin(eq(true), sortCaptor.capture());
        assertTrue(sortCaptor.getValue().getOrderFor("dateGeneration").isAscending());
    }

    @Test
    @DisplayName("getValidatedRapports: uses search query when search term is provided")
    void getValidatedRapports_searchQuery() {
        when(rapportRepository.findValidatedByPatientSearch(eq("Doe"), any(Sort.class)))
                .thenReturn(List.of(rapport));

        List<Rapport> result = rapportService.getValidatedRapports("  Doe  ", "desc");

        assertEquals(1, result.size());
        verify(rapportRepository).findValidatedByPatientSearch(eq("Doe"), any(Sort.class));
        verify(rapportRepository, never()).findByValideParMedecin(anyBoolean(), any(Sort.class));
    }
}
