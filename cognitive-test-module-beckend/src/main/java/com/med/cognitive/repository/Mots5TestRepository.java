package com.med.cognitive.repository;

import com.med.cognitive.entity.Mots5Test;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface Mots5TestRepository extends JpaRepository<Mots5Test, Long> {
    Optional<Mots5Test> findByCognitiveTestIdAndPatientId(Long cognitiveTestId, Long patientId);
    List<Mots5Test> findByPatientId(Long patientId);
    List<Mots5Test> findByAssignationId(Long assignationId);
}
