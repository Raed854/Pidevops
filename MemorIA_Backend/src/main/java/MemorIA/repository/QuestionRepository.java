package MemorIA.repository;

import MemorIA.entity.diagnostic.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByUserId(Long userId);
    List<Question> findByUserIdOrderByDateCreationDesc(Long userId);

    @Query("SELECT DISTINCT q FROM Question q LEFT JOIN FETCH q.reponses")
    List<Question> findAllWithReponses();
}
