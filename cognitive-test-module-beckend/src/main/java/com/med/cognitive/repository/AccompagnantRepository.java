package com.med.cognitive.repository;

import com.med.cognitive.entity.Accompagnant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccompagnantRepository extends JpaRepository<Accompagnant, Long> {
    java.util.List<Accompagnant> findByPatientId(Long patientId);
}
