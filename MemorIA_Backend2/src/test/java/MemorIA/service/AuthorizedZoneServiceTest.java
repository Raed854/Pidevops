package MemorIA.service;

import MemorIA.entity.Traitements.Traitements;
import MemorIA.entity.Traitements.ZoneAutorisee;
import MemorIA.repository.AuthorizedZoneRepository;
import MemorIA.repository.TreatmentRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthorizedZoneServiceTest {

    @Mock
    private AuthorizedZoneRepository authorizedZoneRepository;

    @Mock
    private TreatmentRepository treatmentRepository;

    @InjectMocks
    private AuthorizedZoneService authorizedZoneService;

    private Traitements traitement;
    private ZoneAutorisee zone;
    private ZoneAutorisee zoneInactive;

    @BeforeEach
    void setUp() {
        traitement = new Traitements();
        traitement.setIdTraitement(1L);
        traitement.setTitre("Traitement Test");

        zone = new ZoneAutorisee();
        zone.setIdZoneAutorisee(1L);
        zone.setNom("Maison");
        zone.setLatitude(48.8566);
        zone.setLongitude(2.3522);
        zone.setRayon(200);
        zone.setActif(true);
        zone.setDateMiseAJour(LocalDateTime.of(2026, 1, 1, 10, 0));
        zone.setTraitements(traitement);

        zoneInactive = new ZoneAutorisee();
        zoneInactive.setIdZoneAutorisee(2L);
        zoneInactive.setNom("École");
        zoneInactive.setLatitude(48.9000);
        zoneInactive.setLongitude(2.4000);
        zoneInactive.setRayon(100);
        zoneInactive.setActif(false);
        zoneInactive.setDateMiseAJour(LocalDateTime.of(2026, 1, 1, 10, 0));
        zoneInactive.setTraitements(traitement);
    }

    // ──────────────────────────────────────────────────────────────
    // getAllAuthorizedZones
    // ──────────────────────────────────────────────────────────────

    @Test
    void getAllAuthorizedZones_returnsList() {
        when(authorizedZoneRepository.findAll()).thenReturn(List.of(zone, zoneInactive));

        List<ZoneAutorisee> result = authorizedZoneService.getAllAuthorizedZones();

        assertThat(result).hasSize(2);
    }

    @Test
    void getAllAuthorizedZones_emptyList() {
        when(authorizedZoneRepository.findAll()).thenReturn(List.of());

        assertThat(authorizedZoneService.getAllAuthorizedZones()).isEmpty();
    }

    // ──────────────────────────────────────────────────────────────
    // getAuthorizedZoneById
    // ──────────────────────────────────────────────────────────────

    @Test
    void getAuthorizedZoneById_found_returnsPresent() {
        when(authorizedZoneRepository.findById(1L)).thenReturn(Optional.of(zone));

        Optional<ZoneAutorisee> result = authorizedZoneService.getAuthorizedZoneById(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getNom()).isEqualTo("Maison");
    }

    @Test
    void getAuthorizedZoneById_notFound_returnsEmpty() {
        when(authorizedZoneRepository.findById(99L)).thenReturn(Optional.empty());

        assertThat(authorizedZoneService.getAuthorizedZoneById(99L)).isEmpty();
    }

    // ──────────────────────────────────────────────────────────────
    // getAuthorizedZonesByTraitementId
    // ──────────────────────────────────────────────────────────────

    @Test
    void getAuthorizedZonesByTraitementId_returnsFilteredByTraitement() {
        when(authorizedZoneRepository.findAll()).thenReturn(List.of(zone, zoneInactive));

        List<ZoneAutorisee> result = authorizedZoneService.getAuthorizedZonesByTraitementId(1L);

        assertThat(result).hasSize(2);
        result.forEach(z -> assertThat(z.getTraitements().getIdTraitement()).isEqualTo(1L));
    }

    @Test
    void getAuthorizedZonesByTraitementId_unknownTraitement_returnsEmpty() {
        when(authorizedZoneRepository.findAll()).thenReturn(List.of(zone, zoneInactive));

        List<ZoneAutorisee> result = authorizedZoneService.getAuthorizedZonesByTraitementId(999L);

        assertThat(result).isEmpty();
    }

    // ──────────────────────────────────────────────────────────────
    // getActiveAuthorizedZones
    // ──────────────────────────────────────────────────────────────

    @Test
    void getActiveAuthorizedZones_returnsOnlyActiveZones() {
        when(authorizedZoneRepository.findByActifTrue()).thenReturn(List.of(zone));

        List<ZoneAutorisee> result = authorizedZoneService.getActiveAuthorizedZones();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getActif()).isTrue();
    }

    // ──────────────────────────────────────────────────────────────
    // getActiveAuthorizedZonesByTraitementId
    // ──────────────────────────────────────────────────────────────

    @Test
    void getActiveAuthorizedZonesByTraitementId_returnsActiveZonesForTraitement() {
        when(authorizedZoneRepository.findAll()).thenReturn(List.of(zone, zoneInactive));

        List<ZoneAutorisee> result = authorizedZoneService.getActiveAuthorizedZonesByTraitementId(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNom()).isEqualTo("Maison");
        assertThat(result.get(0).getActif()).isTrue();
    }

    @Test
    void getActiveAuthorizedZonesByTraitementId_noActiveZones_returnsEmpty() {
        zoneInactive.setActif(false);
        zone.setActif(false);
        when(authorizedZoneRepository.findAll()).thenReturn(List.of(zone, zoneInactive));

        assertThat(authorizedZoneService.getActiveAuthorizedZonesByTraitementId(1L)).isEmpty();
    }

    // ──────────────────────────────────────────────────────────────
    // getAuthorizedZoneByName
    // ──────────────────────────────────────────────────────────────

    @Test
    void getAuthorizedZoneByName_found_returnsPresent() {
        when(authorizedZoneRepository.findByNom("Maison")).thenReturn(Optional.of(zone));

        Optional<ZoneAutorisee> result = authorizedZoneService.getAuthorizedZoneByName("Maison");

        assertThat(result).isPresent();
        assertThat(result.get().getRayon()).isEqualTo(200);
    }

    @Test
    void getAuthorizedZoneByName_notFound_returnsEmpty() {
        when(authorizedZoneRepository.findByNom("Inconnu")).thenReturn(Optional.empty());

        assertThat(authorizedZoneService.getAuthorizedZoneByName("Inconnu")).isEmpty();
    }

    // ──────────────────────────────────────────────────────────────
    // createFromRequest
    // ──────────────────────────────────────────────────────────────

    @Test
    void createFromRequest_success_savesZone() {
        when(treatmentRepository.findById(1L)).thenReturn(Optional.of(traitement));
        when(authorizedZoneRepository.save(any(ZoneAutorisee.class))).thenAnswer(inv -> {
            ZoneAutorisee z = inv.getArgument(0);
            z.setIdZoneAutorisee(10L);
            return z;
        });

        ZoneAutorisee result = authorizedZoneService.createFromRequest(
                "Parc", 48.85, 2.35, 150, true, 1L);

        assertThat(result).isNotNull();
        assertThat(result.getNom()).isEqualTo("Parc");
        assertThat(result.getRayon()).isEqualTo(150);
        assertThat(result.getActif()).isTrue();
        assertThat(result.getDateMiseAJour()).isNotNull();
    }

    @Test
    void createFromRequest_nomNull_throwsIllegalArgument() {
        assertThatThrownBy(() ->
                authorizedZoneService.createFromRequest(null, 48.85, 2.35, 150, true, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("nom");
    }

    @Test
    void createFromRequest_nomBlank_throwsIllegalArgument() {
        assertThatThrownBy(() ->
                authorizedZoneService.createFromRequest("  ", 48.85, 2.35, 150, true, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("nom");
    }

    @Test
    void createFromRequest_latitudeNull_throwsIllegalArgument() {
        assertThatThrownBy(() ->
                authorizedZoneService.createFromRequest("Parc", null, 2.35, 150, true, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("latitude");
    }

    @Test
    void createFromRequest_longitudeNull_throwsIllegalArgument() {
        assertThatThrownBy(() ->
                authorizedZoneService.createFromRequest("Parc", 48.85, null, 150, true, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("longitude");
    }

    @Test
    void createFromRequest_rayonNull_throwsIllegalArgument() {
        assertThatThrownBy(() ->
                authorizedZoneService.createFromRequest("Parc", 48.85, 2.35, null, true, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("rayon");
    }

    @Test
    void createFromRequest_actifNull_throwsIllegalArgument() {
        assertThatThrownBy(() ->
                authorizedZoneService.createFromRequest("Parc", 48.85, 2.35, 150, null, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("actif");
    }

    @Test
    void createFromRequest_traitementNotFound_throwsIllegalArgument() {
        when(treatmentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                authorizedZoneService.createFromRequest("Parc", 48.85, 2.35, 150, true, 99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Traitement introuvable");
    }

    // ──────────────────────────────────────────────────────────────
    // updateFromRequest
    // ──────────────────────────────────────────────────────────────

    @Test
    void updateFromRequest_found_updatesProvidedFields() {
        when(authorizedZoneRepository.findById(1L)).thenReturn(Optional.of(zone));
        when(authorizedZoneRepository.save(any(ZoneAutorisee.class))).thenAnswer(inv -> inv.getArgument(0));

        ZoneAutorisee result = authorizedZoneService.updateFromRequest(
                1L, "Maison Modifiée", 48.90, 2.40, 300, false, null);

        assertThat(result).isNotNull();
        assertThat(result.getNom()).isEqualTo("Maison Modifiée");
        assertThat(result.getLatitude()).isEqualTo(48.90);
        assertThat(result.getRayon()).isEqualTo(300);
        assertThat(result.getActif()).isFalse();
        assertThat(result.getDateMiseAJour()).isNotNull();
    }

    @Test
    void updateFromRequest_notFound_returnsNull() {
        when(authorizedZoneRepository.findById(99L)).thenReturn(Optional.empty());

        ZoneAutorisee result = authorizedZoneService.updateFromRequest(
                99L, "X", 0.0, 0.0, 10, true, null);

        assertThat(result).isNull();
    }

    @Test
    void updateFromRequest_withNewTraitement_updatesTraitement() {
        Traitements newTraitement = new Traitements();
        newTraitement.setIdTraitement(2L);
        newTraitement.setTitre("Autre Traitement");

        when(authorizedZoneRepository.findById(1L)).thenReturn(Optional.of(zone));
        when(treatmentRepository.findById(2L)).thenReturn(Optional.of(newTraitement));
        when(authorizedZoneRepository.save(any(ZoneAutorisee.class))).thenAnswer(inv -> inv.getArgument(0));

        ZoneAutorisee result = authorizedZoneService.updateFromRequest(
                1L, null, null, null, null, null, 2L);

        assertThat(result.getTraitements().getIdTraitement()).isEqualTo(2L);
    }

    // ──────────────────────────────────────────────────────────────
    // createAuthorizedZone (legacy)
    // ──────────────────────────────────────────────────────────────

    @Test
    void createAuthorizedZone_success_setsDateAndSaves() {
        when(authorizedZoneRepository.save(any(ZoneAutorisee.class))).thenAnswer(inv -> inv.getArgument(0));

        ZoneAutorisee result = authorizedZoneService.createAuthorizedZone(zone);

        assertThat(result).isNotNull();
        assertThat(result.getDateMiseAJour()).isNotNull();
        verify(authorizedZoneRepository).save(zone);
    }

    @Test
    void createAuthorizedZone_nullTraitement_throwsIllegalArgument() {
        zone.setTraitements(null);

        assertThatThrownBy(() -> authorizedZoneService.createAuthorizedZone(zone))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Traitement est obligatoire");
    }

    @Test
    void createAuthorizedZone_nullTraitementId_throwsIllegalArgument() {
        traitement.setIdTraitement(null);
        zone.setTraitements(traitement);

        assertThatThrownBy(() -> authorizedZoneService.createAuthorizedZone(zone))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Traitement est obligatoire");
    }

    // ──────────────────────────────────────────────────────────────
    // updateAuthorizedZone (legacy)
    // ──────────────────────────────────────────────────────────────

    @Test
    void updateAuthorizedZone_found_updatesFields() {
        ZoneAutorisee details = new ZoneAutorisee();
        details.setNom("Hôpital");
        details.setLatitude(48.5000);
        details.setLongitude(2.2000);
        details.setRayon(500);
        details.setActif(true);

        when(authorizedZoneRepository.findById(1L)).thenReturn(Optional.of(zone));
        when(authorizedZoneRepository.save(any(ZoneAutorisee.class))).thenAnswer(inv -> inv.getArgument(0));

        ZoneAutorisee result = authorizedZoneService.updateAuthorizedZone(1L, details);

        assertThat(result).isNotNull();
        assertThat(result.getNom()).isEqualTo("Hôpital");
        assertThat(result.getRayon()).isEqualTo(500);
        assertThat(result.getDateMiseAJour()).isNotNull();
    }

    @Test
    void updateAuthorizedZone_notFound_returnsNull() {
        when(authorizedZoneRepository.findById(99L)).thenReturn(Optional.empty());

        assertThat(authorizedZoneService.updateAuthorizedZone(99L, zone)).isNull();
    }

    // ──────────────────────────────────────────────────────────────
    // deactivateAuthorizedZone
    // ──────────────────────────────────────────────────────────────

    @Test
    void deactivateAuthorizedZone_found_setsActifFalse() {
        when(authorizedZoneRepository.findById(1L)).thenReturn(Optional.of(zone));
        when(authorizedZoneRepository.save(any(ZoneAutorisee.class))).thenAnswer(inv -> inv.getArgument(0));

        ZoneAutorisee result = authorizedZoneService.deactivateAuthorizedZone(1L);

        assertThat(result).isNotNull();
        assertThat(result.getActif()).isFalse();
        assertThat(result.getDateMiseAJour()).isNotNull();
    }

    @Test
    void deactivateAuthorizedZone_notFound_returnsNull() {
        when(authorizedZoneRepository.findById(99L)).thenReturn(Optional.empty());

        assertThat(authorizedZoneService.deactivateAuthorizedZone(99L)).isNull();
    }

    // ──────────────────────────────────────────────────────────────
    // deleteAuthorizedZone
    // ──────────────────────────────────────────────────────────────

    @Test
    void deleteAuthorizedZone_callsRepositoryDeleteById() {
        doNothing().when(authorizedZoneRepository).deleteById(1L);

        authorizedZoneService.deleteAuthorizedZone(1L);

        verify(authorizedZoneRepository).deleteById(1L);
    }
}
