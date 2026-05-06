package com.med.cognitive.repository;

import com.med.cognitive.entity.Recommendation;
import com.med.cognitive.entity.enums.RecommendStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {

    List<Recommendation> findByDecisionId(Long decisionId);

    List<Recommendation> findByTargetRole(String targetRole);

    List<Recommendation> findByStatus(RecommendStatus status);

    List<Recommendation> findByTargetRoleAndStatus(String role, RecommendStatus status);

    List<Recommendation> findByDeadlineBeforeAndStatusNot(LocalDateTime date, RecommendStatus status);

    /** Toutes les recommandations créées par un médecin donné */
    List<Recommendation> findByClinicianIdOrderByCreatedAtDesc(Long clinicianId);

    /** Toutes les recommandations d'un patient donné */
    List<Recommendation> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    /** Recommandations d'un patient pour l'aidant (role CAREGIVER) */
    List<Recommendation> findByPatientIdAndTargetRoleOrderByCreatedAtDesc(Long patientId, String targetRole);
}
