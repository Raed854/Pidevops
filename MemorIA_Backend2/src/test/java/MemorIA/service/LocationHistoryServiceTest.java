package MemorIA.service;

import MemorIA.entity.Traitements.HistoriquePosition;
import MemorIA.entity.Traitements.Traitements;
import MemorIA.repository.LocationHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocationHistoryServiceTest {

    @Mock
    private LocationHistoryRepository locationHistoryRepository;

    @InjectMocks
    private LocationHistoryService locationHistoryService;

    private Traitements traitement;
    private HistoriquePosition historique;

    @BeforeEach
    void setUp() {
        traitement = new Traitements();
        traitement.setIdTraitement(1L);
        traitement.setTitre("Traitement Test");

        historique = new HistoriquePosition();
        historique.setIdHistoriquePosition(1L);
        historique.setLatitude(48.8566);
        historique.setLongitude(2.3522);
        historique.setDureeArretMinute(10);
        historique.setHeureArrive(LocalDateTime.of(2026, 1, 1, 9, 0));
        historique.setHeureDepart(LocalDateTime.of(2026, 1, 1, 9, 10));
        historique.setDistancePointPrecedent(0.5);
        historique.setDistancePointSuivant(1.2);
        historique.setDateEnregistrement(LocalDateTime.of(2026, 1, 1, 9, 0));
        historique.setTraitements(traitement);
    }

    // ──────────────────────────────────────────────────────────────
    // getAllLocationHistory
    // ──────────────────────────────────────────────────────────────

    @Test
    void getAllLocationHistory_returnsList() {
        when(locationHistoryRepository.findAll()).thenReturn(List.of(historique));

        List<HistoriquePosition> result = locationHistoryService.getAllLocationHistory();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getLatitude()).isEqualTo(48.8566);
    }

    @Test
    void getAllLocationHistory_emptyList() {
        when(locationHistoryRepository.findAll()).thenReturn(List.of());

        assertThat(locationHistoryService.getAllLocationHistory()).isEmpty();
    }

    // ──────────────────────────────────────────────────────────────
    // getLocationHistoryById
    // ──────────────────────────────────────────────────────────────

    @Test
    void getLocationHistoryById_found_returnsPresent() {
        when(locationHistoryRepository.findById(1L)).thenReturn(Optional.of(historique));

        Optional<HistoriquePosition> result = locationHistoryService.getLocationHistoryById(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getLongitude()).isEqualTo(2.3522);
    }

    @Test
    void getLocationHistoryById_notFound_returnsEmpty() {
        when(locationHistoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThat(locationHistoryService.getLocationHistoryById(99L)).isEmpty();
    }

    // ──────────────────────────────────────────────────────────────
    // getLocationHistoryByTraitementId
    // ──────────────────────────────────────────────────────────────

    @Test
    void getLocationHistoryByTraitementId_returnsFilteredList() {
        when(locationHistoryRepository.findByTraitementsIdTraitement(1L))
                .thenReturn(List.of(historique));

        List<HistoriquePosition> result = locationHistoryService.getLocationHistoryByTraitementId(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTraitements().getIdTraitement()).isEqualTo(1L);
    }

    @Test
    void getLocationHistoryByTraitementId_unknownId_returnsEmpty() {
        when(locationHistoryRepository.findByTraitementsIdTraitement(99L)).thenReturn(List.of());

        assertThat(locationHistoryService.getLocationHistoryByTraitementId(99L)).isEmpty();
    }

    // ──────────────────────────────────────────────────────────────
    // getLocationHistoryByDateRange
    // ──────────────────────────────────────────────────────────────

    @Test
    void getLocationHistoryByDateRange_returnsMatchingRecords() {
        LocalDateTime start = LocalDateTime.of(2026, 1, 1, 0, 0);
        LocalDateTime end   = LocalDateTime.of(2026, 1, 2, 0, 0);

        when(locationHistoryRepository.findByDateEnregistrementBetween(start, end))
                .thenReturn(List.of(historique));

        List<HistoriquePosition> result = locationHistoryService.getLocationHistoryByDateRange(start, end);

        assertThat(result).hasSize(1);
    }

    @Test
    void getLocationHistoryByDateRange_noResults_returnsEmpty() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 0, 0);
        LocalDateTime end   = LocalDateTime.of(2025, 1, 2, 0, 0);

        when(locationHistoryRepository.findByDateEnregistrementBetween(start, end))
                .thenReturn(List.of());

        assertThat(locationHistoryService.getLocationHistoryByDateRange(start, end)).isEmpty();
    }

    // ──────────────────────────────────────────────────────────────
    // getLocationHistoryByTraitementAndDateRange
    // ──────────────────────────────────────────────────────────────

    @Test
    void getLocationHistoryByTraitementAndDateRange_returnsFiltered() {
        LocalDateTime start = LocalDateTime.of(2026, 1, 1, 0, 0);
        LocalDateTime end   = LocalDateTime.of(2026, 1, 2, 0, 0);

        when(locationHistoryRepository
                .findByTraitementsIdTraitementAndDateEnregistrementBetween(1L, start, end))
                .thenReturn(List.of(historique));

        List<HistoriquePosition> result =
                locationHistoryService.getLocationHistoryByTraitementAndDateRange(1L, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTraitements().getIdTraitement()).isEqualTo(1L);
    }

    // ──────────────────────────────────────────────────────────────
    // createLocationHistory
    // ──────────────────────────────────────────────────────────────

    @Test
    void createLocationHistory_withDateSet_savesAsIs() {
        when(locationHistoryRepository.save(any(HistoriquePosition.class))).thenReturn(historique);

        HistoriquePosition result = locationHistoryService.createLocationHistory(historique);

        assertThat(result).isNotNull();
        assertThat(result.getDateEnregistrement()).isEqualTo(LocalDateTime.of(2026, 1, 1, 9, 0));
        verify(locationHistoryRepository).save(historique);
    }

    @Test
    void createLocationHistory_withNullDate_setsDateAutomatically() {
        HistoriquePosition noDate = new HistoriquePosition();
        noDate.setLatitude(48.0);
        noDate.setLongitude(2.0);
        noDate.setDateEnregistrement(null);
        noDate.setTraitements(traitement);

        when(locationHistoryRepository.save(any(HistoriquePosition.class))).thenAnswer(inv -> inv.getArgument(0));

        HistoriquePosition result = locationHistoryService.createLocationHistory(noDate);

        assertThat(result.getDateEnregistrement()).isNotNull();
        assertThat(result.getDateEnregistrement()).isBeforeOrEqualTo(LocalDateTime.now());
    }

    // ──────────────────────────────────────────────────────────────
    // updateLocationHistory
    // ──────────────────────────────────────────────────────────────

    @Test
    void updateLocationHistory_found_updatesAllFields() {
        HistoriquePosition details = new HistoriquePosition();
        details.setLatitude(43.2965);
        details.setLongitude(5.3698);
        details.setDureeArretMinute(20);
        details.setHeureArrive(LocalDateTime.of(2026, 2, 1, 10, 0));
        details.setHeureDepart(LocalDateTime.of(2026, 2, 1, 10, 20));
        details.setDistancePointPrecedent(1.0);
        details.setDistancePointSuivant(2.0);

        when(locationHistoryRepository.findById(1L)).thenReturn(Optional.of(historique));
        when(locationHistoryRepository.save(any(HistoriquePosition.class))).thenAnswer(inv -> inv.getArgument(0));

        HistoriquePosition result = locationHistoryService.updateLocationHistory(1L, details);

        assertThat(result).isNotNull();
        assertThat(result.getLatitude()).isEqualTo(43.2965);
        assertThat(result.getLongitude()).isEqualTo(5.3698);
        assertThat(result.getDureeArretMinute()).isEqualTo(20);
        assertThat(result.getDistancePointPrecedent()).isEqualTo(1.0);
        assertThat(result.getDistancePointSuivant()).isEqualTo(2.0);
    }

    @Test
    void updateLocationHistory_notFound_returnsNull() {
        when(locationHistoryRepository.findById(99L)).thenReturn(Optional.empty());

        HistoriquePosition result = locationHistoryService.updateLocationHistory(99L, historique);

        assertThat(result).isNull();
    }

    // ──────────────────────────────────────────────────────────────
    // deleteLocationHistory
    // ──────────────────────────────────────────────────────────────

    @Test
    void deleteLocationHistory_callsRepositoryDeleteById() {
        doNothing().when(locationHistoryRepository).deleteById(1L);

        locationHistoryService.deleteLocationHistory(1L);

        verify(locationHistoryRepository).deleteById(1L);
    }
}
