package com.med.cognitive.repository;

import com.med.cognitive.entity.CognitiveTest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CognitiveTestRepository extends JpaRepository<CognitiveTest, Long> {

        List<CognitiveTest> findByType(CognitiveTest.TypeTest type);

        List<CognitiveTest> findByIdUser(String userId);

        List<CognitiveTest> findByTitreContainingIgnoreCase(String titre);

        List<CognitiveTest> findByIsActiveTrue();

        List<CognitiveTest> findByDifficultyLevel(CognitiveTest.DifficultyLevel difficultyLevel);

        @org.springframework.data.jpa.repository.Query("SELECT t FROM CognitiveTest t WHERE " +
                        "(:type IS NULL OR t.type = :type) AND " +
                        "(:difficulty IS NULL OR t.difficultyLevel = :difficulty) AND " +
                        "(:isActive IS NULL OR t.isActive = :isActive) AND " +
                        "(:search IS NULL OR LOWER(t.titre) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR LOWER(t.description) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))")
        List<CognitiveTest> findFiltered(
                        @org.springframework.data.repository.query.Param("type") CognitiveTest.TypeTest type,
                        @org.springframework.data.repository.query.Param("difficulty") CognitiveTest.DifficultyLevel difficulty,
                        @org.springframework.data.repository.query.Param("isActive") Boolean isActive,
                        @org.springframework.data.repository.query.Param("search") String search);

        @org.springframework.data.jpa.repository.Query("SELECT DISTINCT t.type FROM CognitiveTest t")
        List<CognitiveTest.TypeTest> findDistinctTypes();
}
