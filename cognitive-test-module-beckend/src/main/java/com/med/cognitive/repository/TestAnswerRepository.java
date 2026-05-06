package com.med.cognitive.repository;

import com.med.cognitive.entity.TestAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestAnswerRepository extends JpaRepository<TestAnswer, Long> {
    List<TestAnswer> findByTestResultId(Long resultId);
    List<TestAnswer> findByTestResultTestId(Long testId);
}
