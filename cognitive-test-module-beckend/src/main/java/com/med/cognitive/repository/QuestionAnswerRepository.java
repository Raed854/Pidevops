package com.med.cognitive.repository;

import com.med.cognitive.entity.QuestionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionAnswerRepository extends JpaRepository<QuestionAnswer, Long> {

    List<QuestionAnswer> findByQuestionIdOrderByOrderIndexAsc(Long questionId);

    List<QuestionAnswer> findByQuestionId(Long questionId);
}
