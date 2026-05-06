package MemorIA.repository;

import MemorIA.entity.diagnostic.PatientAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientAnswerRepository extends JpaRepository<PatientAnswer, Long> {
    List<PatientAnswer> findByDiagnosticIdDiagnostic(Long diagnosticId);
    List<PatientAnswer> findByQuestionId(Long questionId);
    List<PatientAnswer> findByDiagnosticIdDiagnosticAndQuestionId(Long diagnosticId, Long questionId);
}
