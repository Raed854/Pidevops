package com.med.cognitive.repository;

import com.med.cognitive.entity.Decision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DecisionRepository extends JpaRepository<Decision, Long> {

    List<Decision> findByPatientIdOrderByCreatedAtDesc(String patientId);

    List<Decision> findByRiskLevel(Decision.RiskLevel riskLevel);

    List<Decision> findByPatientIdAndRiskLevel(String patientId, Decision.RiskLevel riskLevel);

    List<Decision> findByApprovedFalse();
}
