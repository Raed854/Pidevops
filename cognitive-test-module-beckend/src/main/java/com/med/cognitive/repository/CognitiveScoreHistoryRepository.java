package com.med.cognitive.repository;

import com.med.cognitive.entity.CognitiveScoreHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CognitiveScoreHistoryRepository extends JpaRepository<CognitiveScoreHistory, Long> {

    List<CognitiveScoreHistory> findByPatientIdOrderByEvaluationDateDesc(String patientId);

    List<CognitiveScoreHistory> findByPatientIdAndTrend(String patientId, CognitiveScoreHistory.TrendType trend);

    @Query("SELECT c FROM CognitiveScoreHistory c WHERE c.patientId = ?1 AND c.evaluationDate BETWEEN ?2 AND ?3")
    List<CognitiveScoreHistory> findByPatientAndDateRange(String patientId, LocalDateTime start, LocalDateTime end);
}
