package MemorIA.repository;

import MemorIA.entity.diagnostic.Diagnostic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiagnosticRepository extends JpaRepository<Diagnostic, Long> {
    List<Diagnostic> findByUserId(Long userId);
    List<Diagnostic> findByRiskLevel(String riskLevel);
}
