package MemorIA.repository;

import MemorIA.entity.Accompagnant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccompagnantRepository extends JpaRepository<Accompagnant, Long> {

    @Query("SELECT a FROM Accompagnant a WHERE a.user.id = :userId")
    Optional<Accompagnant> findByUserId(@Param("userId") Long userId);

    @Query("SELECT a FROM Accompagnant a JOIN a.patients p WHERE p.id = :patientId")
    Optional<Accompagnant> findByPatientId(@Param("patientId") Long patientId);

    @Query("SELECT a.patients FROM Accompagnant a WHERE a.id = :accompagnantId")
    List<Object> findPatientsByAccompagnantId(@Param("accompagnantId") Long accompagnantId);
}
