package MemorIA.repository;

import MemorIA.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    Optional<Patient> findByNumeroSecuriteSociale(String nss);
}
