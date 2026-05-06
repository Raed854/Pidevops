package com.med.cognitive.controller;

import com.med.cognitive.dto.VisageAnswerDto;
import com.med.cognitive.dto.VisageResultDto;
import com.med.cognitive.dto.VisageScoreRequestDto;
import com.med.cognitive.dto.VisageScoreResponseDto;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/visage")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class VisageTestController {

    private final TestAnswerRepository testAnswerRepository;
    private final TestQuestionRepository testQuestionRepository;
    private final TestResultRepository testResultRepository;
    private final CognitiveTestRepository cognitiveTestRepository;

    @PostMapping("/submit-score")
    public ResponseEntity<String> submitScore(@RequestBody VisageScoreRequestDto scoreRequest) {
        try {
            log.info("=== SUBMIT SCORE REQUEST ===");
            log.info("Request data: {}", scoreRequest);
            log.info("Test ID: {}", scoreRequest.getTestId());
            log.info("Patient ID: {}", scoreRequest.getPatientId());
            log.info("Score: {}", scoreRequest.getScore());
            
            Long testId = scoreRequest.getTestId();
            Long patientId = scoreRequest.getPatientId();
            Integer score = scoreRequest.getScore();
            
            log.info("Processing request for testId: {}, patientId: {}, score: {}", testId, patientId, score);
            
            // Get test - handle case where test might not exist
            CognitiveTest test = null;
            try {
                test = cognitiveTestRepository.findById(testId)
                        .orElse(null);
            } catch (Exception e) {
                log.warn("Test not found for ID: {}, using default", testId);
            }
            
            if (test == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Test not found: " + testId);
            }
            
            // Create test result
            TestResult result = new TestResult();
            result.setPatientId(String.valueOf(patientId));
            result.setTest(test);
            result.setScoreTotale(score);
            result.setTestDate(LocalDateTime.now());
            result.setDateFin(LocalDateTime.now());
            result.setIsValid(true);
            
            log.info("=== SAVING TEST RESULT ===");
            log.info("Test result: {}", result);
            
            // Save result
            result = testResultRepository.save(result);
            
            log.info("=== TEST RESULT SAVED ===");
            log.info("Saved result with ID: {}", result.getId());
            log.info("Final score saved successfully: {}", score);
            
            // Return JSON response instead of plain text
            String jsonResponse = String.format(
                "{\"success\":true,\"message\":\"Score saved successfully\",\"resultId\":%d,\"score\":%d}",
                result.getId(), score
            );
            
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(jsonResponse);
            
        } catch (Exception e) {
            log.error("Error saving visage test score", e);
            String errorResponse = String.format(
                "{\"success\":false,\"message\":\"Error saving score: %s\"}",
                e.getMessage()
            );
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(errorResponse);
        }
    }

    @GetMapping("/test-answers/{testId}")
    public ResponseEntity<List<TestAnswer>> getTestAnswers(@PathVariable Long testId) {
        try {
            List<TestAnswer> answers = testAnswerRepository.findByTestResultTestId(testId);
            return ResponseEntity.ok(answers);
        } catch (Exception e) {
            log.error("Error getting visage test answers", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/images/{testId}")
    public ResponseEntity<List<String>> getVisageImages(@PathVariable Long testId) {
        try {
            // Get questions for this test to extract image URLs
            List<TestQuestion> questions = testQuestionRepository.findByTestIdOrderByOrderIndexAsc(testId);
            
            List<String> images = questions.stream()
                    .filter(q -> q.getImageUrl() != null)
                    .map(TestQuestion::getImageUrl)
                    .distinct()
                    .collect(Collectors.toList());
                    
            return ResponseEntity.ok(images);
        } catch (Exception e) {
            log.error("Error getting visage images", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private boolean checkVisageAnswer(String selectedImage, String correctImage, String questionCorrectAnswer) {
        if (selectedImage == null || correctImage == null) {
            return false;
        }
        
        // Check by image name first
        if (selectedImage.trim().equalsIgnoreCase(correctImage.trim())) {
            return true;
        }
        
        // Fallback to correct answer field
        if (questionCorrectAnswer != null && selectedImage.trim().equalsIgnoreCase(questionCorrectAnswer.trim())) {
            return true;
        }
        
        return false;
    }
}
