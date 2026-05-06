package MemorIA.service;

import MemorIA.dto.PatientDTO;
import MemorIA.dto.PatientListDTO;
import MemorIA.entity.Patient;

import java.util.List;
import java.util.Optional;

public interface IPatientService {
    List<PatientDTO> getPatientsByDoctor(Long doctorId);
    PatientDTO getPatientById(Long patientId);
    List<PatientDTO> searchPatients(String searchTerm, Long doctorId);

    Optional<Patient> getByUserId(Long userId);
    Patient upsertProfile(Long userId, Patient details);

    List<PatientListDTO> getPatientsForCurrentUser();
}