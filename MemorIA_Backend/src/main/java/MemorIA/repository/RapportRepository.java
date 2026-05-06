package MemorIA.repository;

import MemorIA.entity.diagnostic.Rapport;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RapportRepository extends JpaRepository<Rapport, Long> {
    Optional<Rapport> findByDiagnosticIdDiagnostic(Long idDiagnostic);
    List<Rapport> findByValideParMedecin(Boolean valideParMedecin);
    List<Rapport> findByValideParMedecin(Boolean valideParMedecin, Sort sort);

    List<Rapport> findByDiagnosticUserNomContainingIgnoreCaseAndDiagnosticUserPrenomContainingIgnoreCase(String nom, String prenom);
    List<Rapport> findByDiagnosticUserNomContainingIgnoreCase(String nom);
    List<Rapport> findByDiagnosticUserPrenomContainingIgnoreCase(String prenom);

    List<Rapport> findByDiagnosticTitreContainingIgnoreCase(String titre);

    @Query("SELECT r FROM Rapport r WHERE r.valideParMedecin = true AND " +
           "(LOWER(r.diagnostic.user.nom) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.diagnostic.user.prenom) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Rapport> findValidatedByPatientSearch(@Param("search") String search, Sort sort);
}
