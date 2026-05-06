package com.med.cognitive.repository;

import com.med.cognitive.entity.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TestResultRepository extends JpaRepository<TestResult, Long> {

    Optional<TestResult> findByAssignationId(Long assignId);

    List<TestResult> findByPatientIdOrderByTestDateDesc(String patientId);

    /**
     * Récupère en une seule requête SQL tous les résultats valides d'un patient
     * avec leur test associé (JOIN FETCH), filtrés sur les conditions nécessaires
     * au calcul du score global composite.
     *
     * Conditions :
     *  - isValid = true
     *  - test existant avec un type défini
     *  - scoreTotale non null
     *  - test.totalScore > 0  (pour calculer le pourcentage)
     */
    @Query("SELECT r FROM TestResult r " +
           "JOIN FETCH r.test t " +
           "WHERE r.patientId = :patientId " +
           "AND r.isValid = true " +
           "AND r.scoreTotale IS NOT NULL " +
           "AND t.type IS NOT NULL " +
           "AND t.totalScore > 0 " +
           "ORDER BY r.testDate DESC")
    List<TestResult> findValidResultsWithTestByPatientId(@Param("patientId") String patientId);
}
