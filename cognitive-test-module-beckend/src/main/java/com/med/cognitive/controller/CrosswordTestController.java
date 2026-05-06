package com.med.cognitive.controller;

import com.med.cognitive.dto.CrosswordAnswerDto;
import com.med.cognitive.dto.CrosswordResultDto;
import com.med.cognitive.entity.TestAnswer;
import com.med.cognitive.entity.TestQuestion;
import com.med.cognitive.entity.TestResult;
import com.med.cognitive.entity.CognitiveTest;
import com.med.cognitive.repository.TestAnswerRepository;
import com.med.cognitive.repository.TestQuestionRepository;
import com.med.cognitive.repository.TestResultRepository;
import com.med.cognitive.repository.CognitiveTestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Arrays;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/crossword")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class CrosswordTestController {

    private final TestAnswerRepository testAnswerRepository;
    private final TestQuestionRepository testQuestionRepository;
    private final TestResultRepository testResultRepository;
    private final CognitiveTestRepository cognitiveTestRepository;

    @GetMapping("/definitions/{testId}")
    public ResponseEntity<Map<String, Object>> getCrosswordDefinitions(@PathVariable Long testId) {
        try {
            log.info("Getting crossword definitions for test ID: {}", testId);
            
            Map<String, Object> definitions = new HashMap<>();
            
            // Définitions horizontales
            List<Map<String, Object>> horizontalDefs = Arrays.asList(
                Map.of(
                    "id", "H1", "number", 1, "direction", "H", "length", 5,
                    "clue", "Gros fruit vert ou jaune du potager",
                    "answer", "MELON", "startX", 0, "startY", 0
                ),
                Map.of(
                    "id", "H2", "number", 2, "direction", "H", "length", 3,
                    "clue", "Petit rongeur nuisible",
                    "answer", "RAT", "startX", 0, "startY", 2
                ),
                Map.of(
                    "id", "H3", "number", 3, "direction", "H", "length", 4,
                    "clue", "Substance sucrée produite par les abeilles",
                    "answer", "MIEL", "startX", 1, "startY", 4
                )
            );
            
            // Définitions verticales
            List<Map<String, Object>> verticalDefs = Arrays.asList(
                Map.of(
                    "id", "V1", "number", 1, "direction", "V", "length", 5,
                    "clue", "Grand mammifère marin à longues défenses",
                    "answer", "MORSE", "startX", 0, "startY", 0
                ),
                Map.of(
                    "id", "V2", "number", 2, "direction", "V", "length", 3,
                    "clue", "On y dort la nuit",
                    "answer", "LIT", "startX", 2, "startY", 0
                ),
                Map.of(
                    "id", "V3", "number", 3, "direction", "V", "length", 3,
                    "clue", "Voie de circulation dans une ville",
                    "answer", "RUE", "startX", 3, "startY", 2
                )
            );
            
            definitions.put("horizontal", horizontalDefs);
            definitions.put("vertical", verticalDefs);
            definitions.put("gridSize", 5);
            
            log.info("Crossword definitions retrieved successfully");
            return ResponseEntity.ok(definitions);
            
        } catch (Exception e) {
            log.error("Error getting crossword definitions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/save-answer")
    public ResponseEntity<String> saveAnswer(@RequestBody CrosswordAnswerDto answerDto) {
        try {
            log.info("Saving crossword answer: {}", answerDto);
            
            // Create new test answer
            TestAnswer testAnswer = new TestAnswer();
            
            // Set question
            TestQuestion question = testQuestionRepository.findById(answerDto.getQuestionId())
                    .orElseThrow(() -> new RuntimeException("Question not found: " + answerDto.getQuestionId()));
            testAnswer.setQuestion(question);
            
            // Set answer text
            testAnswer.setAnswerText(answerDto.getAnswer());
            
            // Check if answer is correct (you can implement your logic here)
            boolean isCorrect = checkCrosswordAnswer(answerDto.getAnswer(), question.getCorrectAnswer());
            testAnswer.setIsCorrect(isCorrect);
            
            // Set points
            testAnswer.setPointsObtained(isCorrect ? question.getScore() : 0);
            
            // Save answer
            testAnswerRepository.save(testAnswer);
            
            log.info("Answer saved successfully");
            return ResponseEntity.ok("Answer saved successfully");
            
        } catch (Exception e) {
            log.error("Error saving answer", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error saving answer: " + e.getMessage());
        }
    }

    @PostMapping("/submit-test")
    public ResponseEntity<CrosswordResultDto> submitCrosswordTest(@RequestBody CrosswordResultDto resultDto) {
        try {
            log.info("Submitting crossword test result: {}", resultDto);
            
            // Get test
            CognitiveTest test = cognitiveTestRepository.findById(resultDto.getTestId())
                    .orElseThrow(() -> new RuntimeException("Test not found: " + resultDto.getTestId()));
            
            // Create test result
            TestResult result = new TestResult();
            result.setPatientId(String.valueOf(resultDto.getPatientId()));
            result.setTest(test);
            result.setScoreTotale(resultDto.getScore());
            result.setTestDate(LocalDateTime.now());
            result.setDateFin(LocalDateTime.now());
            result.setIsValid(true);
            
            // Save result
            result = testResultRepository.save(result);
            
            // Update result DTO with saved result ID
            resultDto.setResultId(result.getId());
            
            log.info("Crossword test submitted successfully with score: {}", resultDto.getScore());
            return ResponseEntity.ok(resultDto);
            
        } catch (Exception e) {
            log.error("Error submitting crossword test", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(CrosswordResultDto.builder()
                            .error("Error submitting test: " + e.getMessage())
                            .build());
        }
    }

    @GetMapping("/test-answers/{testId}")
    public ResponseEntity<List<TestAnswer>> getTestAnswers(@PathVariable Long testId) {
        try {
            List<TestAnswer> answers = testAnswerRepository.findByTestResultTestId(testId);
            return ResponseEntity.ok(answers);
        } catch (Exception e) {
            log.error("Error getting test answers", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private boolean checkCrosswordAnswer(String userAnswer, String correctAnswer) {
        if (userAnswer == null || correctAnswer == null) {
            return false;
        }
        return userAnswer.trim().equalsIgnoreCase(correctAnswer.trim());
    }
}
