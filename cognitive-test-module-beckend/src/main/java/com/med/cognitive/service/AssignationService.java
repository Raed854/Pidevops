package com.med.cognitive.service;

import com.med.cognitive.dto.AssignationRequest;
import com.med.cognitive.dto.PersonalizedTestRequest;
import com.med.cognitive.entity.*;
import com.med.cognitive.exception.BusinessLogicException;
import com.med.cognitive.exception.ResourceNotFoundException;
import com.med.cognitive.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AssignationService {

    private final PatientTestAssignRepository assignRepository;
    private final TestResultRepository resultRepository;
    private final TestAnswerRepository answerRepository;
    private final CognitiveTestService testService;
    private final UserModuleService userService;
    private final NotificationService notificationService;
    private final CognitiveScoreHistoryRepository scoreHistoryRepository;

    public PatientTestAssign createAssignation(AssignationRequest request) {
        if (!userService.userExists(request.getPatientId(), "PATIENT"))
            throw new ResourceNotFoundException("Patient not found: " + request.getPatientId());
        if (!userService.userExists(request.getSoignantId(), "SOIGNANT"))
            throw new ResourceNotFoundException("Soignant not found: " + request.getSoignantId());
        if (request.getAccompagnantId() != null
                && !userService.userExists(request.getAccompagnantId(), "ACCOMPAGNANT"))
            throw new ResourceNotFoundException("Accompagnant not found: " + request.getAccompagnantId());

        CognitiveTest test = testService.getById(request.getTestId());
        PatientTestAssign assign = new PatientTestAssign();
        assign.setPatientId(request.getPatientId());
        assign.setTest(test);
        assign.setSoignantId(request.getSoignantId());
        assign.setAccompagnantId(request.getAccompagnantId());
        assign.setDateLimite(request.getDateLimite());
        assign.setInstructions(request.getInstructions());
        assign.setStatus(AssignStatus.ASSIGNED);
        PatientTestAssign saved = assignRepository.save(assign);

        // Notifier l'aidant qu'un test lui a été assigné
        if (request.getAccompagnantId() != null) {
            try {
                String patientName = resolvePatientName(request.getPatientId());
                notificationService.createTestAssigned(
                        request.getPatientId(), patientName, test.getTitre(), request.getAccompagnantId());
            } catch (Exception e) {
                System.err.println("[AssignationService] Notification assign error: " + e.getMessage());
            }
        }

        return saved;
    }

    public List<PatientTestAssign> getAssignationsByMedecin(Long soignantId) {
        return assignRepository.findBySoignantId(soignantId);
    }

    public List<PatientTestAssign> getAssignationsByAidant(Long accompagnantId) {
        return assignRepository.findByAccompagnantIdAndStatus(accompagnantId, AssignStatus.ASSIGNED);
    }

    public List<PatientTestAssign> getPlanningByAidant(Long accompagnantId) {
        return assignRepository.findByAccompagnantId(accompagnantId);
    }

    public List<PatientTestAssign> getAssignationsByPatient(Long patientId) {
        return assignRepository.findByPatientId(patientId);
    }

    public TestResult startTest(Long assignId, Long accompagnantId) {
        PatientTestAssign assign = assignRepository.findById(assignId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignation not found: " + assignId));
        if (assign.getStatus() != AssignStatus.ASSIGNED)
            throw new BusinessLogicException("Test cannot be started. Current status: " + assign.getStatus());

        assign.setStatus(AssignStatus.IN_PROGRESS);
        assignRepository.save(assign);

        TestResult result = new TestResult();
        result.setAssignation(assign);
        result.setPatientId(String.valueOf(assign.getPatientId()));
        result.setAccompagnantId(accompagnantId);
        result.setScoreMax(assign.getTest().getTotalScore());
        result.setDateDebut(LocalDateTime.now());
        TestResult savedResult = resultRepository.save(result);

        // Notifier le soignant que le test a démarré
        if (assign.getSoignantId() != null) {
            try {
                String pName     = resolvePatientName(assign.getPatientId());
                String testTitle = assign.getTest() != null ? assign.getTest().getTitre() : "Test";
                notificationService.createTestStarted(assign.getPatientId(), pName, testTitle, assign.getSoignantId());
            } catch (Exception e) {
                System.err.println("[AssignationService] Notification startTest error: " + e.getMessage());
            }
        }

        return savedResult;
    }

    public TestResult finishTest(Long resultId, List<TestAnswer> answers, String observations) {
        TestResult result = resultRepository.findById(resultId)
                .orElseThrow(() -> new ResourceNotFoundException("Test result not found: " + resultId));

        PatientTestAssign assign = result.getAssignation();

        // 1. Score total
        int scoreTotal = 0;
        for (TestAnswer answer : answers) {
            answer.setTestResult(result);
            scoreTotal += (answer.getPointsObtained() != null ? answer.getPointsObtained() : 0);
            answerRepository.save(answer);
        }
        result.setScoreTotal(scoreTotal);
        result.setObservations(observations);
        result.setDateFin(LocalDateTime.now());
        result.setAnswers(answers);

        // 2. Calculer et stocker scorePercentage + z_score
        Double zScore = null;
        if (result.getTest() != null
                && result.getTest().getTotalScore() != null
                && result.getTest().getTotalScore() > 0) {
            double pct = (scoreTotal / (double) result.getTest().getTotalScore()) * 100.0;
            result.setScorePercentage(pct);
            zScore = (pct - 70.0) / 15.0;
            result.setZScore(zScore);
        }

        assign.setStatus(AssignStatus.COMPLETED);
        assignRepository.save(assign);
        TestResult saved = resultRepository.save(result);

        // 3. Historique des scores (feature 4)
        saveScoreHistory(result, scoreTotal, zScore);

        // 4. Notifications (feature 5)
        sendCompletionNotifications(assign, zScore);

        return saved;
    }

    // ─── Création test personnalisé ───────────────────────────────────────────────

    public PatientTestAssign createPersonalizedAssignation(PersonalizedTestRequest request) {
        try {
            if (!userService.userExists(request.getPatientId(), "PATIENT"))
                throw new ResourceNotFoundException("Patient not found: " + request.getPatientId());

            Patient patient = userService.getPatientById(request.getPatientId());
            if (patient == null)
                throw new ResourceNotFoundException("Patient not found: " + request.getPatientId());

            Long soignantId = request.getSoignantId();
            if (soignantId == null && patient.getSoignant() != null)
                soignantId = patient.getSoignant().getId();
            if (soignantId == null) {
                List<Soignant> soignants = userService.getAllSoignants();
                if (!soignants.isEmpty()) soignantId = soignants.get(0).getId();
                else throw new ResourceNotFoundException("No soignant available in the system");
            }
            if (!userService.userExists(soignantId, "SOIGNANT"))
                throw new ResourceNotFoundException("Soignant not found: " + soignantId);

            CognitiveTest test = new CognitiveTest();
            test.setTitre(request.getTitre() != null ? request.getTitre() : "Test Personnalisé");
            test.setDescription(request.getDescription());
            test.setType(CognitiveTest.TypeTest.MEMORY);
            test.setTotalScore(0);
            test.setIdUser(soignantId.toString());
            test.setIsActive(true);

            if (request.getStage() != null) {
                switch (request.getStage()) {
                    case "STABLE"   -> test.setDifficultyLevel(CognitiveTest.DifficultyLevel.FACILE);
                    case "MOYEN"    -> test.setDifficultyLevel(CognitiveTest.DifficultyLevel.MOYEN);
                    case "CRITIQUE" -> test.setDifficultyLevel(CognitiveTest.DifficultyLevel.AVANCE);
                    default         -> test.setDifficultyLevel(CognitiveTest.DifficultyLevel.MOYEN);
                }
            } else {
                test.setDifficultyLevel(CognitiveTest.DifficultyLevel.MOYEN);
            }

            List<TestQuestion> questions = new ArrayList<>();
            if (request.getItems() != null) {
                int order = 1;
                for (PersonalizedTestRequest.Item item : request.getItems()) {
                    TestQuestion q = new TestQuestion();
                    q.setQuestionText(item.getQuestion());
                    q.setCorrectAnswer(item.getReponse());
                    q.setScore(item.getScore() != null ? item.getScore() : 0);
                    q.setOrderIndex(order++);
                    q.setImageUrl(item.getImageUrl());
                    q.setQuestionType(item.getImageUrl() != null && !item.getImageUrl().isEmpty()
                            ? TestQuestion.QuestionType.IMAGE : TestQuestion.QuestionType.TEXT);
                    if (item.getMetadata() != null && !item.getMetadata().isEmpty())
                        q.setExplanation(item.getMetadata().toString());
                    q.setTest(test);
                    questions.add(q);
                }
            }
            test.setQuestions(questions);
            test = testService.create(test);

            PatientTestAssign assign = new PatientTestAssign();
            assign.setPatientId(request.getPatientId());
            assign.setTest(test);
            assign.setSoignantId(soignantId);
            assign.setAccompagnantId(request.getAccompagnantId());
            assign.setDateLimite(request.getDateLimitAsLocalDate());
            assign.setInstructions(request.getInstructions());
            assign.setStatus(AssignStatus.ASSIGNED);
            assign.setDateAssignation(LocalDateTime.now());
            PatientTestAssign savedPersonalized = assignRepository.save(assign);

            // Notifier l'aidant
            if (request.getAccompagnantId() != null) {
                try {
                    String pName = resolvePatientName(request.getPatientId());
                    notificationService.createTestAssigned(
                            request.getPatientId(), pName, test.getTitre(), request.getAccompagnantId());
                } catch (Exception ignore) {}
            }

            return savedPersonalized;

        } catch (Exception e) {
            System.err.println("Error in createPersonalizedAssignation: " + e.getMessage());
            throw new RuntimeException("Failed to create personalized test: " + e.getMessage(), e);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private void saveScoreHistory(TestResult result, int scoreTotal, Double zScore) {
        try {
            CognitiveScoreHistory history = new CognitiveScoreHistory();
            history.setPatientId(result.getPatientId());
            history.setTestResultId(result.getId());
            history.setGlobalScore(scoreTotal);
            history.setEvaluationDate(LocalDateTime.now());
            if (zScore != null) history.setTrendMagnitude(zScore);
            scoreHistoryRepository.save(history);
        } catch (Exception e) {
            System.err.println("[AssignationService] Score history error: " + e.getMessage());
        }
    }

    private void sendCompletionNotifications(PatientTestAssign assign, Double zScore) {
        if (assign.getSoignantId() == null) return;
        try {
            String patientName = resolvePatientName(assign.getPatientId());
            String testTitle   = assign.getTest() != null ? assign.getTest().getTitre() : "Test";
            notificationService.createTestCompleted(
                    assign.getPatientId(), patientName, testTitle, assign.getSoignantId());
            if (zScore != null && zScore < -1) {
                notificationService.createScoreAlerte(
                        assign.getPatientId(), patientName, zScore, assign.getSoignantId());
            }
        } catch (Exception e) {
            System.err.println("[AssignationService] Notification error: " + e.getMessage());
        }
    }

    private String resolvePatientName(Long patientId) {
        try {
            Patient p = userService.getPatientById(patientId);
            if (p != null) return p.getPrenom() + " " + p.getNom();
        } catch (Exception ignored) {}
        return "Patient #" + patientId;
    }
}
