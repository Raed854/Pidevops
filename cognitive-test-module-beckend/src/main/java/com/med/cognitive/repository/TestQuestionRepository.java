package com.med.cognitive.repository;

import com.med.cognitive.entity.TestQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestQuestionRepository extends JpaRepository<TestQuestion, Long> {

    List<TestQuestion> findByTestIdOrderByOrderIndexAsc(Long testId);

    void deleteByTestId(Long testId);

    @org.springframework.data.jpa.repository.Query("SELECT q FROM TestQuestion q JOIN q.test t WHERE t.type = :type")
    List<TestQuestion> findByTestType(
            @org.springframework.data.repository.query.Param("type") com.med.cognitive.entity.CognitiveTest.TypeTest type);
}
