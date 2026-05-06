package com.med.cognitive.service;

import com.med.cognitive.entity.CognitiveTest;
import com.med.cognitive.repository.CognitiveTestRepository;
import com.med.cognitive.exception.ResourceNotFoundException;
import com.med.cognitive.exception.BusinessLogicException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CognitiveTestService {

    private final CognitiveTestRepository repository;

    public List<CognitiveTest> getAll() {
        return repository.findAll();
    }

    public CognitiveTest getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CognitiveTest not found with id: " + id));
    }

    public CognitiveTest create(CognitiveTest test) {
        if (test.getQuestions() != null) {
            test.getQuestions().forEach(q -> q.setTest(test));
        }
        test.calculateTotalScore();
        return repository.save(test);
    }

    public CognitiveTest update(Long id, CognitiveTest updated) {
        CognitiveTest existing = getById(id);
        existing.setTitre(updated.getTitre());
        existing.setDescription(updated.getDescription());
        existing.setType(updated.getType());
        existing.setDifficultyLevel(updated.getDifficultyLevel());
        existing.setDurationMinutes(updated.getDurationMinutes());
        return repository.save(existing);
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("CognitiveTest not found with id: " + id);
        }
        repository.deleteById(id);
    }

    public void calculateTotalScore(Long testId) {
        CognitiveTest test = getById(testId);
        test.calculateTotalScore();
        repository.save(test);
    }

    public void activateTest(Long id) {
        CognitiveTest test = getById(id);
        if (test.getQuestions().isEmpty()) {
            throw new BusinessLogicException("Cannot activate a test with no questions");
        }
        test.setIsActive(true);
        repository.save(test);
    }

    public void deactivateTest(Long id) {
        CognitiveTest test = getById(id);
        test.setIsActive(false);
        repository.save(test);
    }

    public CognitiveTest duplicateTest(Long id) {
        CognitiveTest original = getById(id);
        CognitiveTest copy = new CognitiveTest();
        copy.setTitre(original.getTitre() + " (Copy)");
        copy.setDescription(original.getDescription());
        copy.setType(original.getType());
        copy.setDifficultyLevel(original.getDifficultyLevel());
        copy.setDurationMinutes(original.getDurationMinutes());
        copy.setIdUser(original.getIdUser());
        copy.setIsActive(false);

        // Note: Deep copy of questions would be needed here for a full duplicate
        // For MVP we just copy metadata

        return repository.save(copy);
    }

    public List<CognitiveTest.TypeTest> getDistinctTypes() {
        return repository.findDistinctTypes();
    }

    public List<CognitiveTest> getFiltered(CognitiveTest.TypeTest type, CognitiveTest.DifficultyLevel difficulty,
            Boolean isActive, String search) {
        return repository.findFiltered(type, difficulty, isActive, search);
    }
}
