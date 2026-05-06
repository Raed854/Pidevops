package com.med.cognitive.service;

import com.med.cognitive.entity.Accompagnant;
import com.med.cognitive.entity.Patient;
import com.med.cognitive.entity.Soignant;

import java.util.List;

public interface UserModuleService {
    Patient getPatientById(Long id);

    Soignant getSoignantById(Long id);

    Accompagnant getAccompagnantById(Long id);

    List<Patient> getPatientsBySoignant(Long soignantId);

    List<Accompagnant> getAccompagnantsByPatient(Long patientId);

    List<Accompagnant> getAllAccompagnants();

    List<Soignant> getAllSoignants();

    boolean userExists(Long id, String type);
}
