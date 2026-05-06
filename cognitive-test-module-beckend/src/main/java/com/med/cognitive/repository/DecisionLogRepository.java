package com.med.cognitive.repository;

import com.med.cognitive.entity.DecisionLog;
import com.med.cognitive.entity.enums.DecisionSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DecisionLogRepository extends JpaRepository<DecisionLog, Long> {

    List<DecisionLog> findByDecisionIdOrderByTimestampDesc(Long decisionId);

    List<DecisionLog> findBySourceType(DecisionSource sourceType);

    @Query("SELECT d FROM DecisionLog d WHERE d.timestamp BETWEEN ?1 AND ?2")
    List<DecisionLog> findByTimestampRange(LocalDateTime start, LocalDateTime end);
}
