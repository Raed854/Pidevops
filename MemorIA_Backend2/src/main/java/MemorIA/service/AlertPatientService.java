package MemorIA.service;

import MemorIA.entity.Traitements.AlertPatient;
import MemorIA.entity.Traitements.TraitementAffectation;
import MemorIA.repository.AlertPatientRepository;
import MemorIA.repository.TraitementAffectationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AlertPatientService {

    @Autowired
    private AlertPatientRepository alertPatientRepository;

    @Autowired
    private TraitementAffectationRepository traitementAffectationRepository;

    public List<AlertPatient> getAllAlerts() {
        return alertPatientRepository.findAll();
    }

    public Optional<AlertPatient> getAlertById(Long id) {
        return alertPatientRepository.findById(id);
    }

    public List<AlertPatient> getAlertsByTraitement(Long idTraitement) {
        return alertPatientRepository.findByTraitementsIdTraitement(idTraitement);
    }

    public List<AlertPatient> getAlertsByTraitementSorted(Long idTraitement) {
        return alertPatientRepository.findByTraitementsIdTraitementOrderByDateAlerteDesc(idTraitement);
    }

    public List<AlertPatient> getUnreadAlertsByTraitement(Long idTraitement) {
        return alertPatientRepository.findByTraitementsIdTraitementAndLuFalseOrderByDateAlerteDesc(idTraitement);
    }

    public long countUnreadAlerts(Long idTraitement) {
        return alertPatientRepository.countByTraitementsIdTraitementAndLuFalse(idTraitement);
    }

    public AlertPatient markAsRead(Long id) {
        Optional<AlertPatient> alert = alertPatientRepository.findById(id);
        if (alert.isPresent()) {
            AlertPatient existing = alert.get();
            existing.setLu(true);
            return alertPatientRepository.save(existing);
        }
        return null;
    }

    public void markAllAsRead(Long idTraitement) {
        List<AlertPatient> unread = alertPatientRepository
                .findByTraitementsIdTraitementAndLuFalseOrderByDateAlerteDesc(idTraitement);
        for (AlertPatient a : unread) {
            a.setLu(true);
        }
        alertPatientRepository.saveAll(unread);
    }

    public AlertPatient createAlert(AlertPatient alert) {
        return alertPatientRepository.save(alert);
    }

    public AlertPatient updateAlert(Long id, AlertPatient alertDetails) {
        Optional<AlertPatient> alert = alertPatientRepository.findById(id);
        if (alert.isPresent()) {
            AlertPatient existingAlert = alert.get();
            if (alertDetails.getDateAlerte() != null) {
                existingAlert.setDateAlerte(alertDetails.getDateAlerte());
            }
            if (alertDetails.getAlert() != null) {
                existingAlert.setAlert(alertDetails.getAlert());
            }
            return alertPatientRepository.save(existingAlert);
        }
        return null;
    }

    public void deleteAlert(Long id) {
        alertPatientRepository.deleteById(id);
    }

    public boolean alertExists(Long id) {
        return alertPatientRepository.existsById(id);
    }

    public List<AlertPatient> getAllAlertsSorted() {
        return alertPatientRepository.findAllByOrderByDateAlerteDesc();
    }

    public List<AlertPatient> getAlertsByPatientId(Long patientId) {
        return alertPatientRepository.findByPatientId(patientId);
    }

    public List<AlertPatient> getAlertsByAccompagnantId(Long accompagnantId) {
        return alertPatientRepository.findByAccompagnantId(accompagnantId);
    }

    public List<AlertPatient> getAlertsByAccompagnantAndPatient(Long accompagnantId, Long patientId) {
        return alertPatientRepository.findByAccompagnantIdAndPatientId(accompagnantId, patientId);
    }

    /**
     * Returns the list of patients linked to this accompagnant via TraitementAffectation.
     */
    public List<Map<String, Object>> getPatientsForAccompagnant(Long accompagnantId) {
        List<TraitementAffectation> affectations = traitementAffectationRepository
                .findByAccompagnantUserId(accompagnantId);

        Map<Long, Map<String, Object>> uniquePatients = new LinkedHashMap<>();
        for (TraitementAffectation aff : affectations) {
            if (aff.getPatientUser() == null) continue;
            Long pid = aff.getPatientUser().getId();
            if (uniquePatients.containsKey(pid)) continue;

            // Count unresolved alerts for this patient
            long unresolved = alertPatientRepository.findByAccompagnantIdAndPatientId(accompagnantId, pid)
                    .stream().filter(a -> !a.getLu()).count();

            Map<String, Object> patient = new HashMap<>();
            patient.put("id", pid);
            patient.put("firstName", aff.getPatientUser().getPrenom());
            patient.put("lastName", aff.getPatientUser().getNom());
            patient.put("age", 0);
            patient.put("stage", "Moderate");
            patient.put("adherenceRate", 75);
            patient.put("globalRiskScore", 50);
            patient.put("unresolvedAlerts", unresolved);
            uniquePatients.put(pid, patient);
        }
        return new ArrayList<>(uniquePatients.values());
    }
}
