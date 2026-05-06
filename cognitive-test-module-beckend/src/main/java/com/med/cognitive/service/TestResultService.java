package com.med.cognitive.service;

import com.med.cognitive.entity.TestResult;
import com.med.cognitive.repository.TestResultRepository;
import com.med.cognitive.exception.ResourceNotFoundException;
import com.med.cognitive.validator.TestResultValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TestResultService {

    private final TestResultRepository repository;
    private final TestResultValidator validator;

    public List<TestResult> getAll() {
        return repository.findAll();
    }

    public List<TestResult> getByPatientId(String patientId) {
        return repository.findByPatientIdOrderByTestDateDesc(patientId);
    }

    public TestResult getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TestResult not found with id: " + id));
    }

    public TestResult create(TestResult result) {
        validator.validate(result);
        return repository.save(result);
    }

    public TestResult calculateScores(Long resultId) {
        TestResult result = getById(resultId);

        // Mock logic for score calculations
        // In a real app, this would aggregate answers
        if (result.getMaxPossibleScore() != null && result.getMaxPossibleScore() > 0) {
            double percentage = (double) result.getScoreTotale() / result.getMaxPossibleScore() * 100;
            result.setScorePercentage(percentage);

            // Completion rate check
            if (result.getCompletionRate() != null && result.getCompletionRate() < 50.0) {
                result.setIsValid(false);
                result.setFlaggedReasons("Completion rate too low (< 50%)");
            }
        }

        validator.validate(result);

        return repository.save(result);
    }

    public TestResult generateInterpretation(Long resultId) {
        TestResult result = getById(resultId);

        // Mock interpretation logic
        if (result.getScorePercentage() != null) {
            if (result.getScorePercentage() >= 80) {
                result.setSeverityLevel(TestResult.SeverityLevel.NORMAL);
                result.setInterpretation("Résultats normaux. Aucune inquiétude.");
            } else if (result.getScorePercentage() >= 60) {
                result.setSeverityLevel(TestResult.SeverityLevel.MILD);
                result.setInterpretation("Léger déclin cognitif observé. Surveillance recommandée.");
            } else if (result.getScorePercentage() >= 40) {
                result.setSeverityLevel(TestResult.SeverityLevel.MODERATE);
                result.setInterpretation("Déficit cognitif modéré. Consultation nécessaire.");
            } else {
                result.setSeverityLevel(TestResult.SeverityLevel.SEVERE);
                result.setInterpretation("Déficit cognitif sévère. Prise en charge urgente requise.");
            }
        }

        return repository.save(result);
    }

    public TestResult flagAsInvalid(Long resultId, String reason) {
        TestResult result = getById(resultId);
        result.setIsValid(false);
        result.setFlaggedReasons(reason);
        return repository.save(result);
    }

    public TestResult review(Long resultId, String reviewerId) {
        TestResult result = getById(resultId);
        result.setReviewedBy(reviewerId);
        result.setReviewedAt(LocalDateTime.now());
        return repository.save(result);
    }
}
