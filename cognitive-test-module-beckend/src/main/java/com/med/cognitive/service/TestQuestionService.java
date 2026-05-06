package com.med.cognitive.service;

import com.med.cognitive.entity.TestQuestion;
import com.med.cognitive.entity.CognitiveTest;
import com.med.cognitive.repository.TestQuestionRepository;
import com.med.cognitive.repository.CognitiveTestRepository;
import com.med.cognitive.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TestQuestionService {

    private final TestQuestionRepository repository;
    private final CognitiveTestRepository testRepository;

    public List<TestQuestion> getAllByTestId(Long testId) {
        return repository.findByTestIdOrderByOrderIndexAsc(testId);
    }

    public TestQuestion getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found with id: " + id));
    }

    public TestQuestion create(Long testId, TestQuestion question) {
        CognitiveTest test = testRepository.findById(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + testId));
        question.setTest(test);
        TestQuestion saved = repository.save(question);

        // Recalculate total score
        test.calculateTotalScore();
        testRepository.save(test);

        return saved;
    }

    public TestQuestion update(Long id, TestQuestion updated) {
        TestQuestion existing = getById(id);
        existing.setQuestionText(updated.getQuestionText());
        existing.setQuestionType(updated.getQuestionType());
        existing.setCorrectAnswer(updated.getCorrectAnswer());
        existing.setAnswerOptions(updated.getAnswerOptions());
        existing.setScore(updated.getScore());
        existing.setOrderIndex(updated.getOrderIndex());
        existing.setTimeLimitSeconds(updated.getTimeLimitSeconds());
        existing.setImageUrl(updated.getImageUrl());
        existing.setExplanation(updated.getExplanation());
        existing.setIsRequired(updated.getIsRequired());

        TestQuestion saved = repository.save(existing);

        // Recalculate total score
        CognitiveTest test = existing.getTest();
        test.calculateTotalScore();
        testRepository.save(test);

        return saved;
    }

    public void delete(Long id) {
        TestQuestion question = getById(id);
        CognitiveTest test = question.getTest();
        repository.delete(question);

        // Recalculate total score
        test.calculateTotalScore();
        testRepository.save(test);
    }

    public List<TestQuestion> getByTestType(CognitiveTest.TypeTest type) {
        return repository.findByTestType(type);
    }
}
