package MemorIA.repository;

import MemorIA.entity.Traitements.TraitementAffectation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TraitementAffectationRepository extends JpaRepository<TraitementAffectation, Long> {

    /**
     * Récupère toutes les affectations d'un patient
     */
    List<TraitementAffectation> findByPatientUserId(Long patientUserId);

    /**
     * Récupère toutes les affectations d'un accompagnant
     */
    List<TraitementAffectation> findByAccompagnantUserId(Long accompagnantUserId);

    /**
     * Récupère toutes les affectations d'un traitement
     */
    List<TraitementAffectation> findByTraitementsIdTraitement(Long treatmentId);

    /**
     * Récupère les affectations patient-accompagnant
     */
    List<TraitementAffectation> findByAccompagnantUserIdAndPatientUserId(Long accompagnantId, Long patientId);
}
