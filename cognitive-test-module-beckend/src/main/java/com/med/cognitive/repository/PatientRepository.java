package com.med.cognitive.repository;

import com.med.cognitive.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    /** Tous les patients suivis par un médecin donné */
    List<Patient> findBySoignantId(Long soignantId);
}
