package MemorIA.repository;

import MemorIA.entity.CaregiverLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaregiverLinkRepository extends JpaRepository<CaregiverLink, Long> {

    /**
     * Tous les liens d'un aidant (par userId) — fetch complet pour éviter LazyInitializationException
     */
    @Query("SELECT cl FROM CaregiverLink cl " +
           "LEFT JOIN FETCH cl.caregiver " +
           "LEFT JOIN FETCH cl.patient p " +
           "LEFT JOIN FETCH p.user " +
           "WHERE cl.caregiver.id = :caregiverId")
    List<CaregiverLink> findByCaregiverId(@Param("caregiverId") Long caregiverId);

    /**
     * Liens d'un aidant filtrés par statut — fetch complet
     */
    @Query("SELECT cl FROM CaregiverLink cl " +
           "LEFT JOIN FETCH cl.caregiver " +
           "LEFT JOIN FETCH cl.patient p " +
           "LEFT JOIN FETCH p.user " +
           "WHERE cl.caregiver.id = :caregiverId AND cl.status = :status")
    List<CaregiverLink> findByCaregiverIdAndStatus(@Param("caregiverId") Long caregiverId, @Param("status") String status);

    /**
     * Tous les liens d'un patient
     */
    @Query("SELECT cl FROM CaregiverLink cl WHERE cl.patient.id = :patientId")
    List<CaregiverLink> findByPatientId(@Param("patientId") Long patientId);

    /**
     * L'aidant principal d'un patient
     */
    @Query("SELECT cl FROM CaregiverLink cl WHERE cl.patient.id = :patientId AND cl.isPrimary = true")
    Optional<CaregiverLink> findByPatientIdAndIsPrimaryTrue(@Param("patientId") Long patientId);

    /**
     * Lien spécifique entre aidant et patient
     */
    @Query("SELECT cl FROM CaregiverLink cl WHERE cl.caregiver.id = :caregiverId AND cl.patient.id = :patientId")
    Optional<CaregiverLink> findByCaregiverIdAndPatientId(@Param("caregiverId") Long caregiverId, @Param("patientId") Long patientId);

    /**
     * Liens acceptés pour un patient
     */
    @Query("SELECT cl FROM CaregiverLink cl WHERE cl.patient.id = :patientId AND cl.status = :status")
    List<CaregiverLink> findByPatientIdAndStatus(@Param("patientId") Long patientId, @Param("status") String status);

    /**
     * Liens acceptés d'un aidant
     */
    @Query("SELECT cl FROM CaregiverLink cl " +
           "LEFT JOIN FETCH cl.caregiver " +
           "LEFT JOIN FETCH cl.patient p " +
           "LEFT JOIN FETCH p.user " +
           "WHERE cl.caregiver.id = :caregiverId AND LOWER(cl.status) = 'accepted'")
    List<CaregiverLink> findAcceptedByCaregiverId(@Param("caregiverId") Long caregiverId);

    /**
     * Lien principal et accepté d'un aidant
     */
    @Query("SELECT cl FROM CaregiverLink cl " +
           "LEFT JOIN FETCH cl.caregiver " +
           "LEFT JOIN FETCH cl.patient p " +
           "LEFT JOIN FETCH p.user " +
           "WHERE cl.caregiver.id = :caregiverId AND cl.isPrimary = true AND LOWER(cl.status) = 'accepted'")
    Optional<CaregiverLink> findPrimaryAcceptedByCaregiverId(@Param("caregiverId") Long caregiverId);

    /**
     * Liens acceptes d'un aidant, resolves par userId OU email (fallback donnees legacy).
     */
    @Query("SELECT cl FROM CaregiverLink cl " +
           "LEFT JOIN FETCH cl.caregiver cg " +
           "LEFT JOIN FETCH cl.patient p " +
           "LEFT JOIN FETCH p.user " +
           "WHERE LOWER(cl.status) = 'accepted' AND (cg.id = :caregiverUserId OR LOWER(cg.email) = LOWER(:caregiverEmail))")
    List<CaregiverLink> findAcceptedByCaregiverUser(@Param("caregiverUserId") Long caregiverUserId,
                                                     @Param("caregiverEmail") String caregiverEmail);

    /**
     * Lien principal accepte, resolve par userId OU email.
     */
    @Query("SELECT cl FROM CaregiverLink cl " +
           "LEFT JOIN FETCH cl.caregiver cg " +
           "LEFT JOIN FETCH cl.patient p " +
           "LEFT JOIN FETCH p.user " +
           "WHERE cl.isPrimary = true AND LOWER(cl.status) = 'accepted' " +
           "AND (cg.id = :caregiverUserId OR LOWER(cg.email) = LOWER(:caregiverEmail))")
    Optional<CaregiverLink> findPrimaryAcceptedByCaregiverUser(@Param("caregiverUserId") Long caregiverUserId,
                                                                @Param("caregiverEmail") String caregiverEmail);

    /**
     * Lien explicite aidant/patient, robuste userId/email.
     */
    @Query("SELECT cl FROM CaregiverLink cl " +
           "LEFT JOIN cl.caregiver cg " +
           "WHERE cl.patient.id = :patientId AND (cg.id = :caregiverUserId OR LOWER(cg.email) = LOWER(:caregiverEmail))")
    Optional<CaregiverLink> findByCaregiverUserAndPatientId(@Param("caregiverUserId") Long caregiverUserId,
                                                             @Param("caregiverEmail") String caregiverEmail,
                                                             @Param("patientId") Long patientId);
}
