package MemorIA.service;

import MemorIA.entity.Traitements.Traitements;
import MemorIA.entity.Traitements.ZoneAutorisee;
import MemorIA.repository.AuthorizedZoneRepository;
import MemorIA.repository.TreatmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class AuthorizedZoneService {

    private final AuthorizedZoneRepository authorizedZoneRepository;
    private final TreatmentRepository treatmentRepository;

    public AuthorizedZoneService(AuthorizedZoneRepository authorizedZoneRepository,
                                  TreatmentRepository treatmentRepository) {
        this.authorizedZoneRepository = authorizedZoneRepository;
        this.treatmentRepository      = treatmentRepository;
    }

    // ── Queries ──────────────────────────────────────────────────────────────

    public List<ZoneAutorisee> getAllAuthorizedZones() {
        return authorizedZoneRepository.findAll();
    }

    public Optional<ZoneAutorisee> getAuthorizedZoneById(Long id) {
        return authorizedZoneRepository.findById(id);
    }

    public List<ZoneAutorisee> getAuthorizedZonesByTraitementId(Long traitementId) {
        return authorizedZoneRepository.findAll().stream()
                .filter(z -> z.getTraitements().getIdTraitement().equals(traitementId))
                .toList();
    }

    public List<ZoneAutorisee> getActiveAuthorizedZones() {
        return authorizedZoneRepository.findByActifTrue();
    }

    public List<ZoneAutorisee> getActiveAuthorizedZonesByTraitementId(Long traitementId) {
        return authorizedZoneRepository.findAll().stream()
                .filter(z -> z.getTraitements().getIdTraitement().equals(traitementId) && z.getActif())
                .toList();
    }

    public Optional<ZoneAutorisee> getAuthorizedZoneByName(String nom) {
        return authorizedZoneRepository.findByNom(nom);
    }

    // ── Create from request DTO fields ───────────────────────────────────────
    // Uses TreatmentRepository so @JsonBackReference on ZoneAutorisee.traitements
    // never interferes with deserialization.

    public ZoneAutorisee createFromRequest(String nom, Double latitude, Double longitude,
                                           Integer rayon, Boolean actif, Long idTraitement) {
        if (nom == null || nom.trim().isEmpty())
            throw new IllegalArgumentException("Le nom de la zone est obligatoire.");
        if (latitude  == null) throw new IllegalArgumentException("La latitude est obligatoire.");
        if (longitude == null) throw new IllegalArgumentException("La longitude est obligatoire.");
        if (rayon     == null) throw new IllegalArgumentException("Le rayon est obligatoire.");
        if (actif     == null) throw new IllegalArgumentException("Le statut actif est obligatoire.");

        Traitements traitement = treatmentRepository.findById(idTraitement)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Traitement introuvable avec l'id " + idTraitement));

        ZoneAutorisee zone = new ZoneAutorisee();
        zone.setNom(nom.trim());
        zone.setLatitude(latitude);
        zone.setLongitude(longitude);
        zone.setRayon(rayon);
        zone.setActif(actif);
        zone.setTraitements(traitement);
        zone.setDateMiseAJour(LocalDateTime.now());

        return authorizedZoneRepository.save(zone);
    }

    // ── Update from request DTO fields ───────────────────────────────────────

    public ZoneAutorisee updateFromRequest(Long id, String nom, Double latitude, Double longitude,
                                           Integer rayon, Boolean actif, Long idTraitement) {
        return authorizedZoneRepository.findById(id).map(zone -> {
            if (nom       != null) zone.setNom(nom.trim());
            if (latitude  != null) zone.setLatitude(latitude);
            if (longitude != null) zone.setLongitude(longitude);
            if (rayon     != null) zone.setRayon(rayon);
            if (actif     != null) zone.setActif(actif);
            if (idTraitement != null) {
                Traitements traitement = treatmentRepository.findById(idTraitement)
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Traitement introuvable avec l'id " + idTraitement));
                zone.setTraitements(traitement);
            }
            zone.setDateMiseAJour(LocalDateTime.now());
            return authorizedZoneRepository.save(zone);
        }).orElse(null);
    }

    // ── Legacy method (kept for internal use) ────────────────────────────────

    public ZoneAutorisee createAuthorizedZone(ZoneAutorisee authorizedZone) {
        if (authorizedZone.getTraitements() == null || authorizedZone.getTraitements().getIdTraitement() == null)
            throw new IllegalArgumentException("Traitement est obligatoire.");
        authorizedZone.setDateMiseAJour(LocalDateTime.now());
        return authorizedZoneRepository.save(authorizedZone);
    }

    public ZoneAutorisee updateAuthorizedZone(Long id, ZoneAutorisee details) {
        return authorizedZoneRepository.findById(id).map(zone -> {
            zone.setNom(details.getNom());
            zone.setLatitude(details.getLatitude());
            zone.setLongitude(details.getLongitude());
            zone.setRayon(details.getRayon());
            zone.setActif(details.getActif());
            zone.setDateMiseAJour(LocalDateTime.now());
            return authorizedZoneRepository.save(zone);
        }).orElse(null);
    }

    public ZoneAutorisee deactivateAuthorizedZone(Long id) {
        return authorizedZoneRepository.findById(id).map(zone -> {
            zone.setActif(false);
            zone.setDateMiseAJour(LocalDateTime.now());
            return authorizedZoneRepository.save(zone);
        }).orElse(null);
    }

    public void deleteAuthorizedZone(Long id) {
        authorizedZoneRepository.deleteById(id);
    }
}
