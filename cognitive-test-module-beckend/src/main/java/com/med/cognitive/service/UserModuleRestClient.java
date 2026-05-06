package com.med.cognitive.service;

import com.med.cognitive.entity.Accompagnant;
import com.med.cognitive.entity.Patient;
import com.med.cognitive.entity.Soignant;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "user.module.integration", havingValue = "rest")
public class UserModuleRestClient implements UserModuleService {

    private final RestTemplate restTemplate;

    @Value("${user.module.api.url}")
    private String baseUrl;

    @Override
    public Patient getPatientById(Long id) {
        return restTemplate.getForObject(baseUrl + "/patients/" + id, Patient.class);
    }

    @Override
    public Soignant getSoignantById(Long id) {
        return restTemplate.getForObject(baseUrl + "/soignants/" + id, Soignant.class);
    }

    @Override
    public Accompagnant getAccompagnantById(Long id) {
        return restTemplate.getForObject(baseUrl + "/accompagnants/" + id, Accompagnant.class);
    }

    @Override
    public List<Patient> getPatientsBySoignant(Long soignantId) {
        Patient[] patients = restTemplate.getForObject(baseUrl + "/soignants/" + soignantId + "/patients",
                Patient[].class);
        return patients != null ? Arrays.asList(patients) : List.of();
    }

    @Override
    public List<Accompagnant> getAccompagnantsByPatient(Long patientId) {
        Accompagnant[] accompagnants = restTemplate.getForObject(baseUrl + "/patients/" + patientId + "/aidants",
                Accompagnant[].class);
        return accompagnants != null ? Arrays.asList(accompagnants) : List.of();
    }

    @Override
    public List<Accompagnant> getAllAccompagnants() {
        Accompagnant[] accompagnants = restTemplate.getForObject(baseUrl + "/accompagnants",
                Accompagnant[].class);
        return accompagnants != null ? Arrays.asList(accompagnants) : List.of();
    }

    @Override
    public List<Soignant> getAllSoignants() {
        Soignant[] soignants = restTemplate.getForObject(baseUrl + "/soignants",
                Soignant[].class);
        return soignants != null ? Arrays.asList(soignants) : List.of();
    }

    @Override
    public boolean userExists(Long id, String type) {
        try {
            return Boolean.TRUE.equals(
                    restTemplate.getForObject(baseUrl + "/users/exists/" + id + "?type=" + type, Boolean.class));
        } catch (Exception e) {
            return false;
        }
    }
}
