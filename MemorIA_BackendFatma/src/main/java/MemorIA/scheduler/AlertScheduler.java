package MemorIA.scheduler;

import MemorIA.entity.Patient;
import MemorIA.entity.Planning.Reminder;
import MemorIA.entity.Planning.ReminderStatus;
import MemorIA.entity.alerts.Alert;
import MemorIA.entity.alerts.AlertType;
import MemorIA.repository.PatientRepository;
import MemorIA.repository.ReminderRepository;
import MemorIA.repository.AlertRepository;
import MemorIA.service.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * AlertScheduler - Automatisation de la création d'alertes
 * 
 * Tâches programmées:
 * 1. Détection des reminders manqués toutes les 5 minutes
 * 2. Création automatique d'alertes REMINDER_MISSED
 * 3. Escalade des alertes non traitées
 */
@Component
@RequiredArgsConstructor
@Slf4j
@EnableScheduling
public class AlertScheduler {

    private final ReminderRepository reminderRepository;
    private final AlertRepository alertRepository;
    private final PatientRepository patientRepository;
    private final AlertService alertService;

    /**
     * === TÂCHE 1: Détection et création d'alertes reminders manqués ===
     * 
     * Exécutée chaque 5 minutes (300 000 ms)
     * Détecte les reminders qui n'ont pas été confirmés à l'heure
     * Crée automatiquement une alerte REMINDER_MISSED
     */
    @Scheduled(fixedDelay = 300_000) // 5 minutes
    @Transactional
    public void detectAndCreateMissedReminderAlerts() {
        log.info("[AlertScheduler] Starting missed reminder detection...");

        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDate today = LocalDate.now();

            // Cherche les reminders PLANNED ou PENDING qui sont passés
            List<ReminderStatus> statuses = List.of(
                    ReminderStatus.PLANNED,
                    ReminderStatus.PENDING
            );

            // Cherche les reminders dont la date/heure est dépassée d'au moins 30 minutes
            LocalTime thirtyMinutesAgo = now.toLocalTime().minusMinutes(30);

            List<Reminder> overdueReminders = reminderRepository.findOverdueReminders(
                    today,
                    thirtyMinutesAgo,
                    statuses
            );

            log.info("[AlertScheduler] Found {} overdue reminders", overdueReminders.size());

            int createdCount = 0;
            int skippedCount = 0;

            for (Reminder reminder : overdueReminders) {
                try {
                    if (processOverdueReminder(reminder)) {
                        createdCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (Exception ex) {
                    skippedCount++;
                    log.error("[AlertScheduler] Error processing reminder {}: {}",
                            reminder.getIdReminder(), ex.getMessage());
                }
            }

            log.info("[AlertScheduler] Missed reminder detection completed: {} created, {} skipped",
                    createdCount, skippedCount);
        } catch (Exception ex) {
            log.error("[AlertScheduler] Fatal error in detectAndCreateMissedReminderAlerts: {}",
                    ex.getMessage());
        }
    }

    /**
     * Traite un reminder manqué individuel
     * @return true si alerte créée, false si skippée
     */
    @Transactional
    protected boolean processOverdueReminder(Reminder reminder) {
        if (reminder == null || reminder.getIdReminder() == null || reminder.getPatientId() == null) {
            return false;
        }

        // Vérification qu'une alerte REMINDER_MISSED n'existe pas déjà
        boolean alertExists = alertRepository.existsOpenReminderAlert(
                reminder.getPatientId(),
                reminder.getIdReminder(),
                AlertType.REMINDER_MISSED
        );

        if (alertExists) {
            log.debug("[AlertScheduler] Duplicate REMINDER_MISSED alert skipped for reminder {}",
                    reminder.getIdReminder());
            return false;
        }

        Patient patient = patientRepository.findById(reminder.getPatientId())
                .orElse(null);

        if (patient == null) {
            log.warn("[AlertScheduler] Patient {} not found for reminder {}",
                    reminder.getPatientId(), reminder.getIdReminder());
            return false;
        }

        // Créer l'alerte
        try {
            Alert alert = new Alert();
            alert.setPatient(patient);
            alert.setType(AlertType.REMINDER_MISSED);
            alert.setTitle("Missed Reminder: " + (reminder.getTitle() != null ? reminder.getTitle() : "Unknown"));
            alert.setDescription(buildMissedReminderDescription(reminder));
            alert.setSeverity(calculateReminderSeverity(reminder));
            alert.setStatus(Alert.AlertStatus.UNREAD);
            alert.setRead(false);
            alert.setReminderId(reminder.getIdReminder());
            alert.setLinkedReminderId(reminder.getIdReminder());
            alert.setSourceKey("REMINDER_MISSED:" + reminder.getIdReminder());
            alert.setAutoGenerated(true);

            // Calculer le score de gravité initial
            int gravityScore = 40; // Base pour REMINDER_MISSED

            if (reminder.getType() != null) {
                if ("MEDICATION".equals(reminder.getType().name())) {
                    gravityScore += 30; // Extra gravité pour oubli médicament
                } else if ("MEDICAL_APPOINTMENT".equals(reminder.getType().name())) {
                    gravityScore += 40; // Très grave pour rendez-vous manqué
                }
            }

            if (reminder.getPriority() != null) {
                if ("URGENT".equals(reminder.getPriority().name())) {
                    gravityScore += 20;
                } else if ("HIGH".equals(reminder.getPriority().name())) {
                    gravityScore += 10;
                }
            }

            gravityScore = Math.min(gravityScore, 100); // Plafond à 100
            alert.setGravityScore(gravityScore);
            alert.setEscalated(gravityScore >= 75);

            // Sauvegarde
            Alert saved = alertRepository.save(alert);

            log.info("[AlertScheduler] Created REMINDER_MISSED alert {} for reminder {} (gravity: {})",
                    saved.getId(), reminder.getIdReminder(), gravityScore);

            // Marquer le reminder comme MISSED
            reminder.setStatus(ReminderStatus.MISSED);
            reminderRepository.save(reminder);

            return true;

        } catch (Exception ex) {
            log.error("[AlertScheduler] Failed to create alert for reminder {}: {}",
                    reminder.getIdReminder(), ex.getMessage());
            return false;
        }
    }

    /**
     * === TÂCHE 2: Escalade des alertes non traitées depuis longtemps ===
     * 
     * Exécutée chaque 30 minutes
     * Escalade les alertes critiques restées en UNREAD pendant plus de 2h
     * Escalade les alertes HIGH restées en UNREAD pendant plus de 6h
     */
    @Scheduled(fixedDelay = 1_800_000) // 30 minutes
    @Transactional
    public void escalateUntreatedAlerts() {
        log.info("[AlertScheduler] Starting alert escalation check...");

        try {
            LocalDateTime now = LocalDateTime.now();

            // CRITICAL: Escalade après 2 heures
            LocalDateTime twoHoursAgo = now.minusHours(2);
            List<Alert> criticalUntreated = alertRepository.findByStatusAndSeverityBefore(
                    Alert.AlertStatus.UNREAD,
                    Alert.AlertSeverity.CRITICAL,
                    twoHoursAgo
            );

            int escalatedCount = 0;
            for (Alert alert : criticalUntreated) {
                if (!alert.isEscalated()) {
                    alert.setEscalated(true);
                    alertRepository.save(alert);
                    escalatedCount++;
                    log.warn("[AlertScheduler] Escalated CRITICAL alert {} after 2h without treatment",
                            alert.getId());
                }
            }

            // HIGH: Escalade après 6 heures
            LocalDateTime sixHoursAgo = now.minusHours(6);
            List<Alert> highUntreated = alertRepository.findByStatusAndSeverityBefore(
                    Alert.AlertStatus.UNREAD,
                    Alert.AlertSeverity.HIGH,
                    sixHoursAgo
            );

            for (Alert alert : highUntreated) {
                if (!alert.isEscalated()) {
                    alert.setEscalated(true);
                    alertRepository.save(alert);
                    escalatedCount++;
                    log.warn("[AlertScheduler] Escalated HIGH alert {} after 6h without treatment",
                            alert.getId());
                }
            }

            log.info("[AlertScheduler] Alert escalation check completed: {} alerts escalated", escalatedCount);

        } catch (Exception ex) {
            log.error("[AlertScheduler] Error in escalateUntreatedAlerts: {}",
                    ex.getMessage());
        }
    }

    /**
     * === TÂCHE 3: Clôture automatique d'alertes complètement résolues ===
     * 
     * Exécutée chaque 1 heure
     * Archive les alertes résolues depuis plus de 7 jours
     */
    @Scheduled(fixedDelay = 3_600_000) // 1 heure
    @Transactional
    public void archiveResolvedAlerts() {
        log.info("[AlertScheduler] Starting automatic alert archival...");

        try {
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

            // Cherche les alertes résolues depuis plus de 7 jours
            List<Alert> candidates = alertRepository.findByStatusAndResolvedAtBefore(
                    sevenDaysAgo
            );

            log.info("[AlertScheduler] {} alerts eligible for archival", candidates.size());
            // Implémente archival logic si nécessaire (soft delete, etc.)

        } catch (Exception ex) {
            log.error("[AlertScheduler] Error in archiveResolvedAlerts: {}",
                    ex.getMessage());
        }
    }

    /**
     * === HELPERS ===
     */

    /**
     * Construit la description texte pour une alerte REMINDER_MISSED
     */
    private String buildMissedReminderDescription(Reminder reminder) {
        StringBuilder description = new StringBuilder();

        if (reminder.getTitle() != null) {
            description.append("Reminder: ").append(reminder.getTitle());
        }

        if (reminder.getDescription() != null) {
            description.append("\nDetails: ").append(reminder.getDescription());
        }

        if (reminder.getType() != null) {
            description.append("\nType: ").append(reminder.getType().name());
        }

        if (reminder.getReminderDate() != null && reminder.getReminderTime() != null) {
            description.append("\nScheduled: ")
                    .append(reminder.getReminderDate())
                    .append(" at ")
                    .append(reminder.getReminderTime());
        }

        if (reminder.getPriority() != null) {
            description.append("\nPriority: ").append(reminder.getPriority().name());
        }

        description.append("\nThis reminder was not confirmed at the scheduled time and is therefore marked as missed.");

        return description.toString();
    }

    /**
     * Calcule la sévérité initiale pour un reminder manqué
     */
    private Alert.AlertSeverity calculateReminderSeverity(Reminder reminder) {
        // Base: MEDIUM pour tous les reminders manqués
        Alert.AlertSeverity severity = Alert.AlertSeverity.MEDIUM;

        // Augmente à HIGH si URGENT ou critique
        if (reminder.getPriority() != null) {
            if ("URGENT".equals(reminder.getPriority().name())) {
                severity = Alert.AlertSeverity.CRITICAL;
            } else if ("HIGH".equals(reminder.getPriority().name())) {
                severity = Alert.AlertSeverity.HIGH;
            }
        }

        // Augmente à CRITICAL pour certains types
        if (reminder.getType() != null) {
            if ("MEDICAL_APPOINTMENT".equals(reminder.getType().name())) {
                severity = Alert.AlertSeverity.CRITICAL;
            } else if ("MEDICATION".equals(reminder.getType().name()) &&
                       severity != Alert.AlertSeverity.CRITICAL) {
                severity = Alert.AlertSeverity.HIGH;
            }
        }

        // Augmente si criticityLevel est élevé
        if (reminder.getCriticalityLevel() != null && reminder.getCriticalityLevel() >= 8) {
            severity = Alert.AlertSeverity.CRITICAL;
        }

        return severity;
    }
}
