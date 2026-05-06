package com.med.cognitive.repository;

import com.med.cognitive.entity.AssignStatus;
import com.med.cognitive.entity.PatientTestAssign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PatientTestAssignRepository extends JpaRepository<PatientTestAssign, Long> {
    List<PatientTestAssign> findBySoignantId(Long soignantId);

    List<PatientTestAssign> findByPatientId(Long patientId);

    List<PatientTestAssign> findByPatientIdIn(List<Long> patientIds);

    List<PatientTestAssign> findByAccompagnantId(Long accompagnantId);

    List<PatientTestAssign> findByAccompagnantIdAndStatus(Long accompagnantId, AssignStatus status);

    List<PatientTestAssign> findByTestId(Long testId);

    /** Tests assignés (non démarrés) dont la date limite est dépassée — feature 7 */
    @Query("SELECT a FROM PatientTestAssign a WHERE a.status = :status AND a.dateLimite < :date")
    List<PatientTestAssign> findByStatusAndDateLimiteBefore(
            @Param("status") AssignStatus status,
            @Param("date") LocalDate date);

    /** Tests assignés ou en cours pour un médecin et une liste de patients */
    @Query("SELECT a FROM PatientTestAssign a WHERE a.soignantId = :soignantId AND a.status IN :statuses")
    List<PatientTestAssign> findBySoignantIdAndStatusIn(
            @Param("soignantId") Long soignantId,
            @Param("statuses") List<AssignStatus> statuses);

    /** Assignations dans une plage de dates pour le calendrier */
    @Query("SELECT a FROM PatientTestAssign a WHERE a.soignantId = :soignantId " +
           "AND a.dateAssignation BETWEEN :from AND :to")
    List<PatientTestAssign> findBySoignantAndDateRange(
            @Param("soignantId") Long soignantId,
            @Param("from") java.time.LocalDateTime from,
            @Param("to") java.time.LocalDateTime to);
}
