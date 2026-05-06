package com.med.cognitive.service;

import com.med.cognitive.entity.Accompagnant;
import com.med.cognitive.entity.Patient;
import com.med.cognitive.entity.Soignant;
import com.med.cognitive.repository.AccompagnantRepository;
import com.med.cognitive.repository.PatientRepository;
import com.med.cognitive.repository.SoignantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "user.module.integration", havingValue = "db")
public class UserModuleDbService implements UserModuleService {

    private final PatientRepository patientRepository;
    private final SoignantRepository soignantRepository;
    private final AccompagnantRepository accompagnantRepository;

    @Override
    public Patient getPatientById(Long id) {
        return patientRepository.findById(id).orElse(null);
    }

    @Override
    public Soignant getSoignantById(Long id) {
        return soignantRepository.findById(id).orElse(null);
    }

    @Override
    public Accompagnant getAccompagnantById(Long id) {
        return accompagnantRepository.findById(id).orElse(null);
    }

    @Override
    public List<Patient> getPatientsBySoignant(Long soignantId) {
        // In a real system, there would be a many-to-many or one-to-many relationship
        // For now, returning all for simplicity or we could add a soignant_id to
        // Patient
        return patientRepository.findAll();
    }

    @Override
    public List<Accompagnant> getAccompagnantsByPatient(Long patientId) {
        return accompagnantRepository.findByPatientId(patientId);
    }

    @Override
    public List<Accompagnant> getAllAccompagnants() {
        return accompagnantRepository.findAll();
    }

    @Override
    public List<Soignant> getAllSoignants() {
        return soignantRepository.findAll();
    }

    @Override
    public boolean userExists(Long id, String type) {
        return switch (type) {
            case "PATIENT" -> patientRepository.existsById(id);
            case "SOIGNANT" -> soignantRepository.existsById(id);
            case "ACCOMPAGNANT" -> accompagnantRepository.existsById(id);
            default -> false;
        };
    }
}
