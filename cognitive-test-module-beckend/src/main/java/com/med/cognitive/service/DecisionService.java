package com.med.cognitive.service;

import com.med.cognitive.entity.Decision;
import com.med.cognitive.entity.Recommendation;
import com.med.cognitive.entity.TestResult;
import com.med.cognitive.entity.enums.PriorityLevel;
import com.med.cognitive.entity.enums.DecisionSource;
import com.med.cognitive.repository.DecisionRepository;
import com.med.cognitive.repository.TestResultRepository;
import com.med.cognitive.exception.ResourceNotFoundException;
import com.med.cognitive.validator.DecisionValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class DecisionService {

    private final DecisionRepository repository;
    private final TestResultRepository testResultRepository;
    private final DecisionValidator validator;
    private final NotificationService notificationService;

    public List<Decision> getByPatientId(String patientId) {
        return repository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    public Decision getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Decision not found: " + id));
    }

    /**
     * Moteur de décision enrichi (feature 3) :
     * Utilise le z-score, le severityLevel ET le score brut pour
     * produire une décision multi-dimensionnelle.
     */
    public Decision createAutoDecision(Long testResultId) {
        TestResult result = testResultRepository.findById(testResultId)
                .orElseThrow(() -> new ResourceNotFoundException("TestResult not found: " + testResultId));

        Decision decision = new Decision();
        decision.setPatientId(result.getPatientId());
        decision.setTestResult(result);
        decision.setSourceType(DecisionSource.RULE_BASED);

        // Règles enrichies — priorité au z-score s'il est disponible
        if (result.getZScore() != null) {
            applyZScoreRules(decision, result.getZScore());
        } else if (result.getSeverityLevel() != null) {
            applySeverityRules(decision, result.getSeverityLevel());
        } else {
            decision.setDecisionType(Decision.DecisionType.SURVEILLANCE);
            decision.setRiskLevel(Decision.RiskLevel.FAIBLE);
            decision.setExplanation("Données insuffisantes pour une décision précise. Surveillance standard.");
            decision.setConfidence(0.5);
        }

        validator.validate(decision);
        Decision saved = repository.save(decision);

        // Notifier le médecin si risque élevé ou critique
        if (saved.getRiskLevel() == Decision.RiskLevel.ELEVE
                || saved.getRiskLevel() == Decision.RiskLevel.CRITIQUE) {
            tryNotifyDecisionPending(result, saved);
        }

        return saved;
    }

    public Decision approveDecision(Long id, String approverId) {
        Decision decision = getById(id);
        decision.setApproved(true);
        decision.setApprovedBy(approverId);
        decision.setApprovedAt(LocalDateTime.now());
        generateRecommendations(id);
        return repository.save(decision);
    }

    public void generateRecommendations(Long decisionId) {
        Decision decision = getById(decisionId);

        if (decision.getRiskLevel() == Decision.RiskLevel.ELEVE
                || decision.getRiskLevel() == Decision.RiskLevel.CRITIQUE) {
            addRecommendation(decision,
                    "Prendre rendez-vous avec un neurologue",
                    PriorityLevel.HIGH,
                    "MEDECIN",
                    LocalDateTime.now().plusWeeks(1));
        }

        if (decision.getRiskLevel() == Decision.RiskLevel.CRITIQUE) {
            addRecommendation(decision,
                    "Évaluation neuropsychologique complète",
                    PriorityLevel.HIGH,
                    "MEDECIN",
                    LocalDateTime.now().plusDays(3));
            addRecommendation(decision,
                    "Augmenter la fréquence des tests cognitifs (hebdomadaire)",
                    PriorityLevel.HIGH,
                    "CAREGIVER",
                    LocalDateTime.now().plusWeeks(1));
        }

        if (decision.getRiskLevel() == Decision.RiskLevel.MOYEN) {
            addRecommendation(decision,
                    "Exercices de stimulation cognitive quotidiens",
                    PriorityLevel.MEDIUM,
                    "CAREGIVER",
                    LocalDateTime.now().plusWeeks(2));
        }

        repository.save(decision);
    }

    // ─── Moteur de règles z-score ─────────────────────────────────────────────────

    private void applyZScoreRules(Decision decision, double zScore) {
        if (zScore >= -0.5) {
            decision.setDecisionType(Decision.DecisionType.SURVEILLANCE);
            decision.setRiskLevel(Decision.RiskLevel.FAIBLE);
            decision.setExplanation(String.format(
                    "Score z = %.2f — Fonctionnement cognitif dans la norme. Surveillance standard.", zScore));
            decision.setConfidence(0.95);
        } else if (zScore >= -1.0) {
            decision.setDecisionType(Decision.DecisionType.SURVEILLANCE);
            decision.setRiskLevel(Decision.RiskLevel.MOYEN);
            decision.setExplanation(String.format(
                    "Score z = %.2f — Légère atteinte. Surveillance rapprochée et exercices recommandés.", zScore));
            decision.setConfidence(0.85);
        } else if (zScore >= -2.0) {
            decision.setDecisionType(Decision.DecisionType.CONSULTATION);
            decision.setRiskLevel(Decision.RiskLevel.ELEVE);
            decision.setExplanation(String.format(
                    "Score z = %.2f — Atteinte modérée. Consultation spécialiste recommandée sous 2 semaines.", zScore));
            decision.setConfidence(0.88);
        } else {
            decision.setDecisionType(Decision.DecisionType.URGENCE);
            decision.setRiskLevel(Decision.RiskLevel.CRITIQUE);
            decision.setExplanation(String.format(
                    "Score z = %.2f — Atteinte sévère. Intervention neurologique urgente requise.", zScore));
            decision.setConfidence(0.92);
        }
    }

    private void applySeverityRules(Decision decision, TestResult.SeverityLevel severity) {
        switch (severity) {
            case NORMAL -> {
                decision.setDecisionType(Decision.DecisionType.SURVEILLANCE);
                decision.setRiskLevel(Decision.RiskLevel.FAIBLE);
                decision.setExplanation("Résultats normaux. Poursuite de la surveillance standard.");
                decision.setConfidence(0.95);
            }
            case MILD -> {
                decision.setDecisionType(Decision.DecisionType.SURVEILLANCE);
                decision.setRiskLevel(Decision.RiskLevel.MOYEN);
                decision.setExplanation("Léger déclin. Surveillance rapprochée recommandée.");
                decision.setConfidence(0.85);
            }
            case MODERATE -> {
                decision.setDecisionType(Decision.DecisionType.CONSULTATION);
                decision.setRiskLevel(Decision.RiskLevel.ELEVE);
                decision.setExplanation("Signes modérés. Consultation spécialiste requise.");
                decision.setConfidence(0.80);
            }
            case SEVERE -> {
                decision.setDecisionType(Decision.DecisionType.URGENCE);
                decision.setRiskLevel(Decision.RiskLevel.CRITIQUE);
                decision.setExplanation("Situation critique. Intervention immédiate nécessaire.");
                decision.setConfidence(0.90);
            }
        }
    }

    private void addRecommendation(Decision decision, String action,
                                   PriorityLevel priority,
                                   String role,
                                   LocalDateTime deadline) {
        Recommendation rec = new Recommendation();
        rec.setDecision(decision);
        rec.setAction(action);
        rec.setPriority(priority);
        rec.setTargetRole(role);
        rec.setDeadline(deadline);
        decision.getRecommendations().add(rec);
    }

    private void tryNotifyDecisionPending(TestResult result, Decision decision) {
        try {
            // On notifie via patientId — le soignant sera identifié via l'assignation
            if (result.getAssignation() != null && result.getAssignation().getSoignantId() != null) {
                notificationService.createDecisionPending(
                        Long.parseLong(result.getPatientId()),
                        "Patient #" + result.getPatientId(),
                        result.getAssignation().getSoignantId());
            }
        } catch (Exception ignored) {}
    }
}
