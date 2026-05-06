package com.med.cognitive.service;

import com.med.cognitive.entity.AssignStatus;
import com.med.cognitive.entity.PatientTestAssign;
import com.med.cognitive.repository.PatientTestAssignRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SchedulerService {

    private final PatientTestAssignRepository assignRepository;
    private final NotificationService notificationService;
    private final UserModuleService userModuleService;

    /**
     * Chaque matin à 7h00 : marque les tests dont la date limite est dépassée
     * comme EXPIRED et notifie les médecins concernés.
     */
    @Scheduled(cron = "0 0 7 * * *")
    @Transactional
    public void processExpiredAssignations() {
        log.info("[Scheduler] Vérification des tests expirés...");
        List<PatientTestAssign> expiredList =
                assignRepository.findByStatusAndDateLimiteBefore(AssignStatus.ASSIGNED, LocalDate.now());

        for (PatientTestAssign assign : expiredList) {
            assign.setStatus(AssignStatus.EXPIRED);
            assignRepository.save(assign);

            String patientName = resolvePatientName(assign.getPatientId());
            String testTitle   = assign.getTest() != null ? assign.getTest().getTitre() : "Test inconnu";

            if (assign.getSoignantId() != null) {
                notificationService.createTestExpired(
                        assign.getPatientId(), patientName, testTitle, assign.getSoignantId());
            }
        }
        log.info("[Scheduler] {} test(s) marqué(s) EXPIRED.", expiredList.size());
    }

    /**
     * Lance immédiatement la vérification des expirés (utile pour les tests
     * ou pour déclencher manuellement).
     * Endpoint: POST /api/notifications/trigger-expired-check
     */
    @Transactional
    public int triggerExpiredCheck() {
        List<PatientTestAssign> expiredList =
                assignRepository.findByStatusAndDateLimiteBefore(AssignStatus.ASSIGNED, LocalDate.now());

        for (PatientTestAssign assign : expiredList) {
            assign.setStatus(AssignStatus.EXPIRED);
            assignRepository.save(assign);

            String patientName = resolvePatientName(assign.getPatientId());
            String testTitle   = assign.getTest() != null ? assign.getTest().getTitre() : "Test inconnu";

            if (assign.getSoignantId() != null) {
                notificationService.createTestExpired(
                        assign.getPatientId(), patientName, testTitle, assign.getSoignantId());
            }
        }
        return expiredList.size();
    }

    private String resolvePatientName(Long patientId) {
        try {
            var patient = userModuleService.getPatientById(patientId);
            if (patient != null) {
                return patient.getPrenom() + " " + patient.getNom();
            }
        } catch (Exception e) {
            log.warn("[Scheduler] Impossible de récupérer le patient ID {}", patientId);
        }
        return "Patient #" + patientId;
    }
}
