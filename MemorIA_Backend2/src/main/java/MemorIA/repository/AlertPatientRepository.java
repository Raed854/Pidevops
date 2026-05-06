package MemorIA.repository;

import MemorIA.entity.Traitements.AlertPatient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AlertPatientRepository extends JpaRepository<AlertPatient, Long> {

    List<AlertPatient> findByTraitementsIdTraitement(Long idTraitement);

    List<AlertPatient> findByTraitementsIdTraitementOrderByDateAlerteDesc(Long idTraitement);

    List<AlertPatient> findByTraitementsIdTraitementAndLuFalseOrderByDateAlerteDesc(Long idTraitement);

    long countByTraitementsIdTraitementAndLuFalse(Long idTraitement);

    @Query("SELECT a FROM AlertPatient a JOIN a.traitements t JOIN t.affectations af WHERE af.patientUser.id = :patientId ORDER BY a.dateAlerte DESC")
    List<AlertPatient> findByPatientId(@Param("patientId") Long patientId);

    @Query("SELECT a FROM AlertPatient a JOIN a.traitements t JOIN t.affectations af WHERE af.accompagnantUser.id = :accompagnantId ORDER BY a.dateAlerte DESC")
    List<AlertPatient> findByAccompagnantId(@Param("accompagnantId") Long accompagnantId);

    @Query("SELECT a FROM AlertPatient a JOIN a.traitements t JOIN t.affectations af WHERE af.accompagnantUser.id = :accompagnantId AND af.patientUser.id = :patientId ORDER BY a.dateAlerte DESC")
    List<AlertPatient> findByAccompagnantIdAndPatientId(@Param("accompagnantId") Long accompagnantId, @Param("patientId") Long patientId);

    List<AlertPatient> findAllByOrderByDateAlerteDesc();
}
