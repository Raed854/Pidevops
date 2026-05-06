package MemorIA.repository;

import MemorIA.entity.Traitements.Disponibilite;
import MemorIA.entity.role.StatutDisponibilite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DisponibiliteRepository extends JpaRepository<Disponibilite, Long> {

    @Query("SELECT d FROM Disponibilite d LEFT JOIN FETCH d.patient WHERE d.user.id = :userId")
    List<Disponibilite> findByUserId(@Param("userId") Long userId);

    @Query("SELECT d FROM Disponibilite d WHERE d.user.id = :userId AND d.date = :date")
    List<Disponibilite> findByUserIdAndDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Query("SELECT d FROM Disponibilite d WHERE d.user.id = :userId AND d.statut = :statut")
    List<Disponibilite> findByUserIdAndStatut(@Param("userId") Long userId, @Param("statut") StatutDisponibilite statut);

    @Query("SELECT d FROM Disponibilite d WHERE d.user.id = :userId AND d.date = :date AND d.statut = :statut")
    List<Disponibilite> findByUserIdAndDateAndStatut(@Param("userId") Long userId, @Param("date") LocalDate date, @Param("statut") StatutDisponibilite statut);

    @Query("SELECT d FROM Disponibilite d WHERE d.statut = :statut")
    List<Disponibilite> findByStatut(@Param("statut") StatutDisponibilite statut);
}
