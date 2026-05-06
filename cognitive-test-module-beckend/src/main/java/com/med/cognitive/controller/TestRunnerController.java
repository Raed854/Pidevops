package com.med.cognitive.controller;

import com.med.cognitive.dto.TestResultRequestDto;
import com.med.cognitive.dto.TestWithQuestionsDto;
import com.med.cognitive.entity.*;
import com.med.cognitive.repository.*;
import com.med.cognitive.service.AnswerGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TestRunnerController {

    private final CognitiveTestRepository testRepository;
    private final TestQuestionRepository questionRepository;
    private final QuestionAnswerRepository answerRepository;
    private final PatientTestAssignRepository assignRepository;
    private final TestResultRepository resultRepository;
    private final TestAnswerRepository testAnswerRepository;
    private final AnswerGenerationService answerGenerationService;

    @GetMapping("/{testId}")
    public ResponseEntity<TestWithQuestionsDto> getTestWithQuestions(@PathVariable("testId") Long testId) {
        CognitiveTest test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Test not found with id: " + testId));

        // Check if this is a 5 mots test and return special response
        if (test.getTitre() != null && test.getTitre().toLowerCase().contains("5 mots")) {
            return handle5MotsTest(testId);
        }

        // Check if this is a visages test and return special response
        if (test.getTitre() != null && test.getTitre().toLowerCase().contains("visages")) {
            return handleVisagesTest(testId);
        }

        // Check if this is a mots croises test and return special response
        if (test.getTitre() != null && test.getTitre().toLowerCase().contains("mots croises")) {
            return handleMotsCroisesTest(testId);
        }

        List<TestQuestion> questions = questionRepository.findByTestIdOrderByOrderIndexAsc(testId);

        List<TestWithQuestionsDto.QuestionDto> questionDtos = questions.stream()
                .map(this::mapQuestionToDto)
                .collect(Collectors.toList());

        TestWithQuestionsDto response = TestWithQuestionsDto.builder()
                .testId(test.getId())
                .testName(test.getTitre())
                .testType(test.getType() != null ? test.getType().name() : null)
                .difficultyLevel(test.getDifficultyLevel() != null ? test.getDifficultyLevel().name() : null)
                .durationMinutes(test.getDurationMinutes())
                .questions(questionDtos)
                .build();

        return ResponseEntity.ok(response);
    }

    private ResponseEntity<TestWithQuestionsDto> handle5MotsTest(Long testId) {
        // Find a patient assignment for this test to get patient context
        List<PatientTestAssign> assignments = assignRepository.findByTestId(testId);
        
        TestWithQuestionsDto response;
        if (!assignments.isEmpty()) {
            // No assignment found, return basic info
            response = TestWithQuestionsDto.builder()
                    .testId(testId)
                    .testName("Test des 5 mots")
                    .testType("MEMORY_5_MOTS")
                    .is5MotsTest(true)
                    .redirectUrl("/test-5mots?testId=" + testId + "&patientId=2")
                    .build();
        } else {
            // Use first assignment to get patient info
            PatientTestAssign assignment = assignments.get(0);
            response = TestWithQuestionsDto.builder()
                    .testId(testId)
                    .testName("Test des 5 mots")
                    .testType("MEMORY_5_MOTS")
                    .is5MotsTest(true)
                    .patientId(assignment.getPatientId())
                    .patientName("Patient ID " + assignment.getPatientId())
                    .redirectUrl("/test-5mots?testId=" + testId + "&patientId=" + assignment.getPatientId() + "&assignationId=" + assignment.getId())
                    .build();
        }
        
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<TestWithQuestionsDto> handleVisagesTest(Long testId) {
        // Find a patient assignment for this test to get patient context
        List<PatientTestAssign> assignments = assignRepository.findByTestId(testId);
        
        TestWithQuestionsDto response;
        if (assignments.isEmpty()) {
            // No assignment found, return basic info
            response = TestWithQuestionsDto.builder()
                    .testId(testId)
                    .testName("Test de Reconnaissance des Visages")
                    .testType("VISAGES_RECOGNITION")
                    .isVisagesTest(true)
                    .redirectUrl("/test-visages?testId=" + testId + "&patientId=2")
                    .build();
        } else {
            // Use first assignment to get patient info
            PatientTestAssign assignment = assignments.get(0);
            response = TestWithQuestionsDto.builder()
                    .testId(testId)
                    .testName("Test de Reconnaissance des Visages")
                    .testType("VISAGES_RECOGNITION")
                    .isVisagesTest(true)
                    .patientId(assignment.getPatientId())
                    .patientName("Patient ID " + assignment.getPatientId())
                    .redirectUrl("/test-visages?testId=" + testId + "&patientId=" + assignment.getPatientId() + "&assignationId=" + assignment.getId())
                    .build();
        }
        
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<TestWithQuestionsDto> handleMotsCroisesTest(Long testId) {
        // Find any assignment for this test to get patient info
        List<PatientTestAssign> assignments = assignRepository.findByTestId(testId);
        PatientTestAssign assignment = assignments.isEmpty() ? null : assignments.get(0);
        
        TestWithQuestionsDto response = TestWithQuestionsDto.builder()
                    .testId(testId)
                    .testName("Test de Mots Croisés")
                    .testType("MOTS_CROISES")
                    .isMotsCroisesTest(true)
                    .patientId(assignment != null ? assignment.getPatientId() : null)
                    .patientName(assignment != null ? "Patient ID " + assignment.getPatientId() : "No assignment")
                    .redirectUrl("/test-mots-croises?testId=" + testId + "&patientId=" + (assignment != null ? assignment.getPatientId() : "1") + "&assignationId=" + (assignment != null ? assignment.getId() : "0"))
                    .build();
        
        return ResponseEntity.ok(response);
    }

    private TestWithQuestionsDto.QuestionDto mapQuestionToDto(TestQuestion question) {
        List<QuestionAnswer> answers = answerRepository.findByQuestionIdOrderByOrderIndexAsc(question.getId());

        List<TestWithQuestionsDto.AnswerDto> answerDtos = answers.stream()
                .map(a -> TestWithQuestionsDto.AnswerDto.builder()
                        .id(a.getId())
                        .answerText(a.getAnswerText())
                        .imageUrl(a.getImageUrl())
                        .isCorrect(a.getIsCorrect())
                        .orderIndex(a.getOrderIndex())
                        .build())
                .collect(Collectors.toList());

        // Fallback to old structure if no answers found
        if (answerDtos.isEmpty() && question.getAnswerOptions() != null && !question.getAnswerOptions().isEmpty()) {
            answerDtos = question.getAnswerOptions().stream()
                    .map(opt -> TestWithQuestionsDto.AnswerDto.builder()
                            .answerText(opt)
                            .isCorrect(opt.equals(question.getCorrectAnswer()))
                            .build())
                    .collect(Collectors.toList());
        }
        
        // Ultimate fallback: generate default MCQ answers if still empty
        if (answerDtos.isEmpty()) {
            answerDtos = generateDefaultAnswers(question);
        }

        return TestWithQuestionsDto.QuestionDto.builder()
                .id(question.getId())
                .questionText(question.getQuestionText())
                .questionType(question.getQuestionType() != null ? question.getQuestionType().name() : "MCQ")
                .imageUrl(question.getImageUrl())
                .answers(answerDtos)
                .build();
    }
    
    private List<TestWithQuestionsDto.AnswerDto> generateDefaultAnswers(TestQuestion question) {
        // Generate 4 default MCQ options based on question type
        String questionText = question.getQuestionText().toLowerCase();
        
        if (questionText.contains("date") || questionText.contains("jour")) {
            return List.of(
                TestWithQuestionsDto.AnswerDto.builder().answerText("Lundi 23 Février 2026").isCorrect(true).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Mardi 24 Février 2026").isCorrect(false).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Dimanche 22 Février 2026").isCorrect(false).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Mercredi 25 Février 2026").isCorrect(false).build()
            );
        } else if (questionText.contains("pays") || questionText.contains("france")) {
            return List.of(
                TestWithQuestionsDto.AnswerDto.builder().answerText("France").isCorrect(true).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Belgique").isCorrect(false).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Suisse").isCorrect(false).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Canada").isCorrect(false).build()
            );
        } else if (questionText.contains("capitale") || questionText.contains("paris")) {
            return List.of(
                TestWithQuestionsDto.AnswerDto.builder().answerText("Paris").isCorrect(true).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Lyon").isCorrect(false).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Marseille").isCorrect(false).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Bordeaux").isCorrect(false).build()
            );
        } else if (questionText.contains("couleur")) {
            return List.of(
                TestWithQuestionsDto.AnswerDto.builder().answerText("Rouge").isCorrect(false).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Bleu").isCorrect(true).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Vert").isCorrect(false).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Jaune").isCorrect(false).build()
            );
        } else {
            // Generic default answers
            return List.of(
                TestWithQuestionsDto.AnswerDto.builder().answerText("Option A").isCorrect(true).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Option B").isCorrect(false).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Option C").isCorrect(false).build(),
                TestWithQuestionsDto.AnswerDto.builder().answerText("Option D").isCorrect(false).build()
            );
        }
    }

    @PostMapping("/{testId}/results")
    public ResponseEntity<TestResult> submitTestResult(
            @PathVariable("testId") Long testId,
            @RequestBody TestResultRequestDto request) {

        CognitiveTest test = testRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("Test not found with id: " + testId));

        // Create test result
        TestResult result = new TestResult();
        result.setPatientId(String.valueOf(request.getPatientId()));
        result.setTest(test);
        result.setScoreTotale(request.getScore());
        result.setTestDate(LocalDateTime.now());
        result.setDateFin(LocalDateTime.now());
        result.setIsValid(true);

        // Link to assignment if provided
        if (request.getAssignationId() != null) {
            PatientTestAssign assignation = assignRepository.findById(request.getAssignationId())
                    .orElse(null);
            result.setAssignation(assignation);
        }

        // Save result first
        result = resultRepository.save(result);

        // Save individual answers
        if (request.getAnswers() != null) {
            for (TestResultRequestDto.AnswerRequestDto answerDto : request.getAnswers()) {
                TestAnswer testAnswer = new TestAnswer();
                testAnswer.setTestResult(result);

                TestQuestion question = questionRepository.findById(answerDto.getQuestionId())
                        .orElse(null);
                testAnswer.setQuestion(question);
                testAnswer.setIsCorrect(answerDto.getCorrect());

                // Get answer text from QuestionAnswer if available
                if (answerDto.getAnswerId() != null) {
                    QuestionAnswer qa = answerRepository.findById(answerDto.getAnswerId()).orElse(null);
                    if (qa != null) {
                        testAnswer.setAnswerText(qa.getAnswerText());
                        testAnswer.setPointsObtained(qa.getIsCorrect() ? qa.getScore() : 0);
                    }
                }

                testAnswerRepository.save(testAnswer);
            }
        }

        return new ResponseEntity<>(result, HttpStatus.CREATED);
    }

    @PostMapping("/{testId}/generate-answers")
    public ResponseEntity<Map<String, Object>> generateAnswers(@PathVariable("testId") Long testId) {
        int generatedCount = answerGenerationService.generateAnswersForTest(testId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("testId", testId);
        response.put("answersGenerated", generatedCount);
        response.put("message", generatedCount + " réponses générées avec succès");
        
        return ResponseEntity.ok(response);
    }
}
