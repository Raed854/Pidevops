package MemorIA.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import MemorIA.entity.Patient;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    /**
     * Retrieves all active patients for a doctor.
     * NOTE: Currently returns all active patients since doctor-patient relationship doesn't exist in Patient entity.
     * Use LEFT JOIN FETCH to eagerly load User relationship and prevent LazyInitializationException.
     * TODO: Implement proper doctor-patient relationship in Patient entity for filtering by specific doctor
     */
    @Query("SELECT p FROM Patient p LEFT JOIN FETCH p.user " +
           "WHERE p.user.actif = true " +
           "ORDER BY p.user.nom, p.user.prenom")
    List<Patient> findByDoctorId(@Param("doctorId") Long doctorId);

    @Query("SELECT p FROM Patient p LEFT JOIN FETCH p.user WHERE p.user.actif = true")
    List<Patient> findByActifTrue();

    @Query("SELECT p FROM Patient p LEFT JOIN FETCH p.user WHERE " +
           "LOWER(p.user.nom) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(p.user.prenom) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<Patient> findByNomContainingIgnoreCaseOrPrenomContainingIgnoreCase(@Param("searchTerm") String searchTerm);

    /**
     * Retourne un patient lié à l'accompagnant (id user) pour les flux simples.
     */
    @Query("SELECT p FROM Patient p LEFT JOIN FETCH p.user WHERE p.accompagnant.user.id = :userId")
    Optional<Patient> findByAccompagnantUserId(@Param("userId") Long userId);

    /**
     * Version liste conservée pour les écrans qui doivent afficher plusieurs patients.
     */
    @Query("SELECT p FROM Patient p LEFT JOIN FETCH p.user WHERE p.accompagnant.user.id = :userId")
    List<Patient> findAllByAccompagnantUserId(@Param("userId") Long userId);

    /** Récupère le patient lié à un user donné */
    Optional<Patient> findByUserId(Long userId);

    /**
     * Fallback robuste quand l'id user et l'id accompagnant se confondent (MapsId).
     */
    Optional<Patient> findFirstByAccompagnant_Id(Long accompagnantId);

    @Query("SELECT p FROM Patient p LEFT JOIN FETCH p.user WHERE p.accompagnant.user.email = :email")
    List<Patient> findAllByAccompagnantUserEmail(@Param("email") String email);

    @Query("SELECT p FROM Patient p LEFT JOIN FETCH p.user WHERE p.accompagnant.user.email = :email")
    Optional<Patient> findFirstByAccompagnantUserEmail(@Param("email") String email);

    @Query("SELECT p FROM Patient p LEFT JOIN FETCH p.user WHERE p.accompagnant.id = :accompagnantId")
    List<Patient> findAllByAccompagnantId(@Param("accompagnantId") Long accompagnantId);

    @Query("SELECT p FROM Patient p LEFT JOIN FETCH p.user WHERE p.accompagnant.id = :accompagnantId")
    Optional<Patient> findFirstByAccompagnantId(@Param("accompagnantId") Long accompagnantId);
}