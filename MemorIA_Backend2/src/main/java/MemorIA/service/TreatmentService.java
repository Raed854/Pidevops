package MemorIA.service;

import MemorIA.entity.Traitements.Traitements;
import MemorIA.entity.Traitements.TraitementAffectation;
import MemorIA.entity.Traitements.StatutAffectation;
import MemorIA.entity.Traitements.Disponibilite;
import MemorIA.entity.User;
import MemorIA.entity.role.StatutDisponibilite;
import MemorIA.repository.TreatmentRepository;
import MemorIA.repository.TraitementAffectationRepository;
import MemorIA.repository.UserRepository;
import MemorIA.repository.DisponibiliteRepository;
import MemorIA.dto.PatientNameDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class TreatmentService {

    @Autowired
    private TreatmentRepository treatmentRepository;

    @Autowired
    private TraitementAffectationRepository traitementAffectationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DisponibiliteRepository disponibiliteRepository;

    /**
     * Crée un traitement et l'assigne à un patient + accompagnant
     * Si un accompagnant est fourni → marquer ses disponibilités comme RESERVE
     */
    public TraitementAffectation createTreatmentForPatient(
            Long treatmentId,
            Long patientUserId,
            Long accompagnantUserId,
            LocalDateTime dateFinPrevue,
            String notes) {

        Traitements savedTreatment = treatmentRepository.findById(treatmentId)
                .orElseThrow(() -> new IllegalArgumentException("Treatment not found: " + treatmentId));
        User patientUser = userRepository.findById(patientUserId)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + patientUserId));
        User accompagnantUser = null;
        if (accompagnantUserId != null) {
            accompagnantUser = userRepository.findById(accompagnantUserId).orElse(null);
        }

        TraitementAffectation affectation = new TraitementAffectation();
        affectation.setTraitements(savedTreatment);
        affectation.setPatientUser(patientUser);
        affectation.setAccompagnantUser(accompagnantUser);
        affectation.setDateAffectation(LocalDateTime.now());
        affectation.setDateFinPrevue(dateFinPrevue);
        affectation.setStatut(StatutAffectation.EN_COURS);
        affectation.setNotes(notes);

        TraitementAffectation savedAffectation = traitementAffectationRepository.save(affectation);

        // Si un accompagnant est assigné → marquer toutes ses disponibilités LIBRE comme RESERVE
        if (accompagnantUser != null) {
            List<Disponibilite> libresDisponibilites = disponibiliteRepository
                    .findByUserIdAndStatut(accompagnantUser.getId(), StatutDisponibilite.LIBRE);

            for (Disponibilite dispo : libresDisponibilites) {
                dispo.setStatut(StatutDisponibilite.RESERVE);
                dispo.setPatient(patientUser);
                disponibiliteRepository.save(dispo);
            }
            System.out.println("[TreatmentService] " + libresDisponibilites.size()
                    + " disponibilités de l'accompagnant " + accompagnantUser.getPrenom()
                    + " passées de LIBRE à RESERVE pour le patient " + patientUser.getPrenom());
        }

        return savedAffectation;
    }

    /**
     * Récupère les traitements d'un patient
     */
    public List<TraitementAffectation> getTreatmentsByPatient(Long patientUserId) {
        return traitementAffectationRepository.findByPatientUserId(patientUserId);
    }

    /**
     * Récupère les affectations d'un accompagnant
     */
    public List<TraitementAffectation> getTreatmentsByAccompagnant(Long accompagnantUserId) {
        return traitementAffectationRepository.findByAccompagnantUserId(accompagnantUserId);
    }

    /**
     * Récupère les affectations d'un patient pour un accompagnant
     */
    public List<TraitementAffectation> getTreatmentsByPatientAndAccompagnant(Long patientUserId, Long accompagnantUserId) {
        return traitementAffectationRepository.findByAccompagnantUserIdAndPatientUserId(accompagnantUserId, patientUserId);
    }

    /**
     * Récupère tous les traitements
     */
    public List<Traitements> getAllTreatments() {
        return treatmentRepository.findAll();
    }

    /**
     * Récupère un traitement par son ID
     */
    public Optional<Traitements> getTreatmentById(Long id) {
        return treatmentRepository.findById(id);
    }

    /**
     * Crée un traitement
     */
    public Traitements createTreatment(Traitements treatment) {
        return treatmentRepository.save(treatment);
    }

    /**
     * Met à jour un traitement
     */
    public Traitements updateTreatment(Long id, Traitements treatmentDetails) {
        return treatmentRepository.findById(id).map(treatment -> {
            treatment.setTitre(treatmentDetails.getTitre());
            treatment.setAlerteActive(treatmentDetails.getAlerteActive());
            treatment.setTypeAlerte(treatmentDetails.getTypeAlerte());
            treatment.setDateCreation(treatmentDetails.getDateCreation());
            return treatmentRepository.save(treatment);
        }).orElse(null);
    }

    /**
     * Met à jour le statut d'une affectation
     */
    public TraitementAffectation updateAffectationStatus(Long affectationId, StatutAffectation statut) {
        return traitementAffectationRepository.findById(affectationId).map(affectation -> {
            affectation.setStatut(statut);
            TraitementAffectation updated = traitementAffectationRepository.save(affectation);

            // Si statut → TERMINE ou ANNULE → libérer les disponibilités de l'accompagnant
            User accompagnant = affectation.getAccompagnantUser();
            if (accompagnant != null && (statut == StatutAffectation.TERMINE || statut == StatutAffectation.ANNULE)) {
                List<Disponibilite> reserveesDisponibilites = disponibiliteRepository
                        .findByUserIdAndStatut(accompagnant.getId(), StatutDisponibilite.RESERVE);

                for (Disponibilite dispo : reserveesDisponibilites) {
                    dispo.setStatut(StatutDisponibilite.LIBRE);
                    dispo.setPatient(null);
                    disponibiliteRepository.save(dispo);
                }
                System.out.println("[TreatmentService] " + reserveesDisponibilites.size()
                        + " disponibilités de l'accompagnant " + accompagnant.getPrenom()
                        + " passées de RESERVE à LIBRE (traitement " + statut + ")");
            }

            return updated;
        }).orElse(null);
    }

    /**
     * Récupère les traitements avec alertes actives
     */
    public List<Traitements> getActiveTreatments() {
        return treatmentRepository.findByAlerteActiveTrue();
    }

    /**
     * Récupère un traitement par titre
     */
    public Optional<Traitements> getTreatmentByTitle(String titre) {
        return treatmentRepository.findByTitre(titre);
    }

    /**
     * Récupère les traitements par type d'alerte
     */
    public List<Traitements> getTreatmentsByAlertType(String typeAlerte) {
        return treatmentRepository.findByTypeAlerte(typeAlerte);
    }

    /**
     * Récupère les noms des patients affectés à un accompagnant
     */
    public List<PatientNameDto> getPatientsNamesForAccompagnant(Long accompagnantUserId) {
        List<TraitementAffectation> affectations = traitementAffectationRepository
                .findByAccompagnantUserId(accompagnantUserId);
        
        return affectations.stream()
                .map(aff -> new PatientNameDto(
                        aff.getPatientUser().getId(),
                        aff.getPatientUser().getPrenom(),
                        aff.getPatientUser().getNom(),
                        aff.getPatientUser().getTelephone(),
                        aff.getPatientUser().getEmail()
                ))
                .toList();
    }

    /**
     * Supprime une affectation et libère les disponibilités de l'accompagnant
     */
    public void deleteAffectation(Long affectationId) {
        Optional<TraitementAffectation> affectation = traitementAffectationRepository.findById(affectationId);
        if (affectation.isPresent()) {
            User accompagnant = affectation.get().getAccompagnantUser();
            traitementAffectationRepository.deleteById(affectationId);

            // Libérer les disponibilités de l'accompagnant
            if (accompagnant != null) {
                List<Disponibilite> reserveesDisponibilites = disponibiliteRepository
                        .findByUserIdAndStatut(accompagnant.getId(), StatutDisponibilite.RESERVE);

                for (Disponibilite dispo : reserveesDisponibilites) {
                    dispo.setStatut(StatutDisponibilite.LIBRE);
                    dispo.setPatient(null);
                    disponibiliteRepository.save(dispo);
                }
                System.out.println("[TreatmentService] " + reserveesDisponibilites.size()
                        + " disponibilités de l'accompagnant " + accompagnant.getPrenom()
                        + " libérées (affectation supprimée)");
            }
        }
    }

    /**
     * Supprime un traitement
     */
    public void deleteTreatment(Long id) {
        treatmentRepository.deleteById(id);
    }
}
