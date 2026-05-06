package MemorIA.service;

import MemorIA.dto.CreateReminderRequestDTO;
import MemorIA.entity.Planning.Reminder;
import MemorIA.entity.Planning.ReminderStatus;
import MemorIA.entity.Planning.ReminderType;
import MemorIA.entity.Planning.RecurrenceType;
import MemorIA.entity.Planning.Priority;
import MemorIA.repository.ReminderRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ReminderServiceImpl implements IReminderService {

    @Autowired
    private ReminderRepository reminderRepository;

    // ========== CRÉATION AVEC RÉCURRENCE ==========

    /**
     * Crée un rappel à partir du DTO.
     * Si recurrenceType != NONE, génère automatiquement toutes les occurrences.
     *
     * @param dto Le DTO reçu du frontend Angular
     * @return Liste de tous les rappels créés (1 si NONE, N sinon)
     */
    @Override
    @Transactional
    public List<Reminder> createReminderWithRecurrence(CreateReminderRequestDTO dto) {

        // ── 1. Construire le rappel maître à partir du DTO ──────────────────
        Reminder master = new Reminder();
        master.setPatientId(dto.getPatientId());
        master.setTitle(dto.getTitle());
        master.setDescription(dto.getDescription());
        master.setType(dto.getType());
        master.setReminderDate(dto.getReminderDate());
        master.setReminderTime(dto.getReminderTime());
        master.setDurationMinutes(dto.getDurationMinutes() != null ? dto.getDurationMinutes() : 30);
        master.setPriority(dto.getPriority() != null ? dto.getPriority() : Priority.NORMAL);
        master.setCriticalityLevel(dto.getCriticalityLevel());
        master.setNotes(dto.getInstructions());
        master.setCreatedById(dto.getCreatedById());

        // Destinataires notifications (compatibilite ascendante)
        master.setNotifyPatient(!Boolean.FALSE.equals(dto.getNotifyPatient()));
        master.setNotifyCaregiver(Boolean.TRUE.equals(dto.getNotifyCaregiver()));
        master.setCaregiverId(dto.getCaregiverId());

        // ── 2. Récurrence ────────────────────────────────────────────────────
        RecurrenceType recType = dto.getRecurrenceType() != null
                ? dto.getRecurrenceType() : RecurrenceType.NONE;
        master.setRecurrenceType(recType);
        master.setRecurrenceEndDate(dto.getRecurrenceEndDate());
        master.setIsRecurring(recType != RecurrenceType.NONE);

        // ── 3. Canaux de notification (copie défensive pour éviter shared references) ──
        if (dto.getNotificationChannels() != null) {
            master.setNotificationChannels(new HashSet<>(dto.getNotificationChannels()));
        } else {
            master.setNotificationChannels(new HashSet<>());
        }

        // ── 4. Méta-données ──────────────────────────────────────────────────
        master.setStatus(ReminderStatus.PLANNED);
        master.setIsActive(true);
        master.setCreatedAt(LocalDateTime.now());
        master.setUpdatedAt(LocalDateTime.now());

        // Persister le rappel maître
        Reminder saved = reminderRepository.save(master);

        List<Reminder> result = new ArrayList<>();
        result.add(saved);

        // ── 5. Générer les occurrences si récurrent ──────────────────────────
        if (recType != RecurrenceType.NONE) {
            List<Reminder> occurrences = generateRecurringOccurrences(saved, dto.getRecurrenceEndDate());
            result.addAll(occurrences);
        }

        return result;
    }

    /**
     * Génère et persiste les occurrences récurrentes d'un rappel maître.
     *
     * Algorithme :
     *  ─ DAILY   : cursor avance de +1 jour à chaque itération
     *  ─ WEEKLY  : cursor avance de +7 jours à chaque itération
     *  ─ MONTHLY : cursor avance de +1 mois à chaque itération
     *
     * Sécurité : limite à 365 occurrences maximum pour éviter les boucles infinies.
     *
     * @param master  Rappel maître (date de début = master.reminderDate)
     * @param endDate Date de fin de la série (null = startDate + 1 an)
     * @return Liste de toutes les occurrences créées (hors maître)
     */
    @Override
    @Transactional
    public List<Reminder> generateRecurringOccurrences(Reminder master, LocalDate endDate) {

        // Date de fin par défaut : +1 an si non précisée
        final LocalDate seriesEnd = (endDate != null)
                ? endDate
                : master.getReminderDate().plusYears(1);

        final int MAX_OCCURRENCES = 365; // garde-fou
        final List<Reminder> occurrences = new ArrayList<>();

        // Cursor commence le lendemain du rappel maître (le maître lui-même est déjà sauvé)
        LocalDate cursor = advanceCursor(master.getReminderDate(), master.getRecurrenceType());

        int count = 0;
        while (!cursor.isAfter(seriesEnd) && count < MAX_OCCURRENCES) {

            // Créer une copie du rappel maître pour cette date
            Reminder occurrence = cloneReminder(master, cursor);
            occurrences.add(reminderRepository.save(occurrence));

            // Avancer le curseur selon le type de récurrence
            cursor = advanceCursor(cursor, master.getRecurrenceType());
            count++;
        }

        return occurrences;
    }

    /**
     * Avance le curseur d'une unité selon le type de récurrence.
     *
     * @param current Date courante
     * @param type    Type de récurrence
     * @return Prochaine date de la série
     */
    private LocalDate advanceCursor(LocalDate current, RecurrenceType type) {
        return switch (type) {
            case DAILY   -> current.plusDays(1);
            case WEEKLY  -> current.plusWeeks(1);
            case MONTHLY -> current.plusMonths(1);
            default      -> current.plusYears(100); // NONE → stoppe la boucle
        };
    }

    /**
     * Crée une copie d'un rappel maître pour une date spécifique.
     * Les canaux et la configuration sont hérités du maître.
     */
    private Reminder cloneReminder(Reminder master, LocalDate date) {
        Reminder clone = new Reminder();
        clone.setPatientId(master.getPatientId());
        clone.setTitle(master.getTitle());
        clone.setDescription(master.getDescription());
        clone.setType(master.getType());
        clone.setReminderDate(date);
        clone.setReminderTime(master.getReminderTime());
        clone.setDurationMinutes(master.getDurationMinutes());
        clone.setPriority(master.getPriority());
        clone.setCriticalityLevel(master.getCriticalityLevel());
        clone.setNotes(master.getNotes());
        clone.setCreatedById(master.getCreatedById());
        clone.setNotifyPatient(master.getNotifyPatient());
        clone.setNotifyCaregiver(master.getNotifyCaregiver());
        clone.setCaregiverId(master.getCaregiverId());
        clone.setRecurrenceType(master.getRecurrenceType());
        clone.setRecurrenceEndDate(master.getRecurrenceEndDate());
        clone.setIsRecurring(true);
        // ⚠️ IMPORTANT : créer un NOUVEAU HashSet pour chaque clone
        // Hibernate interdit de partager la même instance de collection (@ElementCollection)
        // entre plusieurs entités — cela lève "shared references to a collection"
        clone.setNotificationChannels(
            master.getNotificationChannels() != null
                ? new HashSet<>(master.getNotificationChannels())
                : new HashSet<>()
        );
        clone.setStatus(ReminderStatus.PLANNED);
        clone.setIsActive(true);
        clone.setCreatedAt(LocalDateTime.now());
        clone.setUpdatedAt(LocalDateTime.now());
        return clone;
    }

    // ========== CRUD BASIQUE ==========

    @Override
    @Transactional
    public Reminder addReminder(Reminder reminder) {
        // Vérification doublon uniquement si date et heure sont renseignées
        if (reminder.getPatientId() != null
                && reminder.getReminderDate() != null
                && reminder.getReminderTime() != null
                && reminderRepository.existsByPatientIdAndReminderDateAndReminderTime(
                        reminder.getPatientId(),
                        reminder.getReminderDate(),
                        reminder.getReminderTime())) {
            throw new IllegalArgumentException("Un rappel existe déjà à cette date/heure pour ce patient");
        }

        reminder.setIsActive(true);
        reminder.setCreatedAt(LocalDateTime.now());
        reminder.setUpdatedAt(LocalDateTime.now());

        if (reminder.getStatus() == null) {
            reminder.setStatus(ReminderStatus.PENDING);
        }
        if (reminder.getPriority() == null) {
            reminder.setPriority(Priority.NORMAL);
        }
        if (reminder.getIsRecurring() == null) {
            reminder.setIsRecurring(false);
        }
        if (reminder.getNotifyPatient() == null) {
            reminder.setNotifyPatient(true);
        }
        if (reminder.getNotifyCaregiver() == null) {
            reminder.setNotifyCaregiver(false);
        }

        return reminderRepository.save(reminder);
    }

    @Override
    @Transactional
    public Reminder updateReminder(Reminder reminder) {
        if (reminder.getIdReminder() == null) {
            throw new IllegalArgumentException("L'ID du rappel ne peut pas être null");
        }

        if (!reminderRepository.existsById(reminder.getIdReminder())) {
            throw new IllegalArgumentException("Rappel introuvable avec l'ID: " + reminder.getIdReminder());
        }

        reminder.setUpdatedAt(LocalDateTime.now());
        return reminderRepository.save(reminder);
    }

    @Override
    @Transactional
    public void deleteReminder(Long idReminder) {
        Reminder reminder = reminderRepository.findById(idReminder)
                .orElseThrow(() -> new IllegalArgumentException("Rappel introuvable"));

        reminder.setIsActive(false);
        reminder.setDeletedAt(LocalDateTime.now());
        reminderRepository.save(reminder);
    }

    @Override
    public Optional<Reminder> getReminderById(Long idReminder) {
        return reminderRepository.findById(idReminder);
    }

    @Override
    public List<Reminder> getAllReminders() {
        return (List<Reminder>) reminderRepository.findAll();
    }

    // ========== RECHERCHE PAR PATIENT ==========

    @Override
    public List<Reminder> getRemindersByPatient(Long patientId) {
        return reminderRepository.findByPatientIdAndIsActiveTrue(patientId);
    }

    @Override
    public List<Reminder> getRemindersByPatientBetweenDates(
            Long patientId,
            LocalDate startDate,
            LocalDate endDate) {
        return reminderRepository.findByPatientIdAndReminderDateBetween(
                patientId, startDate, endDate
        );
    }

    @Override
    public List<Reminder> getRemindersByPatientAndDate(Long patientId, LocalDate date) {
        return reminderRepository.findByPatientIdAndReminderDate(patientId, date);
    }

    @Override
    public List<Reminder> getRemindersByPatientAndType(Long patientId, ReminderType type) {
        return reminderRepository.findByPatientIdAndType(patientId, type);
    }

    // ========== RECHERCHE PAR STATUT ==========

    @Override
    public List<Reminder> getRemindersByStatus(ReminderStatus status) {
        return reminderRepository.findByStatus(status);
    }

    @Override
    public List<Reminder> getRemindersByPatientAndStatus(Long patientId, ReminderStatus status) {
        return reminderRepository.findByPatientIdAndStatus(patientId, status);
    }

    // ========== RECHERCHE PAR DATE ==========

    @Override
    public List<Reminder> getRemindersBetweenDates(LocalDate startDate, LocalDate endDate) {
        return reminderRepository.findByReminderDateBetween(startDate, endDate);
    }

    @Override
    public List<Reminder> getTodayReminders(Long patientId) {
        LocalDate today = LocalDate.now();
        return reminderRepository.findByPatientIdAndReminderDateAndIsActiveTrue(
                patientId, today
        );
    }

    // ========== COMPTAGE ==========

    @Override
    public Long countRemindersByPatientAndStatus(Long patientId, ReminderStatus status) {
        return reminderRepository.countByPatientIdAndStatus(patientId, status);
    }

    @Override
    public Long countRemindersByPatientStatusAndDateRange(
            Long patientId,
            ReminderStatus status,
            LocalDate startDate,
            LocalDate endDate) {
        return reminderRepository.countByPatientIdAndStatusAndReminderDateBetween(
                patientId, status, startDate, endDate
        );
    }

    // ========== MISE À JOUR DE STATUT ==========

    @Override
    public void markAsConfirmed(Long idReminder) {
        Reminder reminder = reminderRepository.findById(idReminder)
                .orElseThrow(() -> new IllegalArgumentException("Rappel introuvable"));

        LocalTime now = LocalTime.now();
        LocalTime reminderTime = reminder.getReminderTime();

        if (reminderTime != null && now.isAfter(reminderTime.plusMinutes(15))) {
            reminder.setStatus(ReminderStatus.CONFIRMED_LATE);
            reminder.setIsLateConfirmation(true);
        } else {
            reminder.setStatus(ReminderStatus.CONFIRMED);
        }

        reminder.setConfirmationTime(LocalDateTime.now());
        reminder.setUpdatedAt(LocalDateTime.now());
        reminderRepository.save(reminder);
    }

    @Override
    public void markAsMissed(Long idReminder) {
        Reminder reminder = reminderRepository.findById(idReminder)
                .orElseThrow(() -> new IllegalArgumentException("Rappel introuvable"));

        reminder.setStatus(ReminderStatus.MISSED);
        reminder.setUpdatedAt(LocalDateTime.now());
        reminderRepository.save(reminder);
    }

    @Override
    public void markAsCanceled(Long idReminder, String reason) {
        Reminder reminder = reminderRepository.findById(idReminder)
                .orElseThrow(() -> new IllegalArgumentException("Rappel introuvable"));

        reminder.setStatus(ReminderStatus.CANCELED);
        if (reason != null && !reason.isEmpty()) {
            String currentNotes = reminder.getNotes() != null ? reminder.getNotes() : "";
            reminder.setNotes(currentNotes + "\nAnnulation: " + reason);
        }

        reminder.setUpdatedAt(LocalDateTime.now());
        reminderRepository.save(reminder);
    }

    // ========== PLANNING (fusionné) ==========

    @Override
    public List<Map<String, Object>> getCalendarEvents(
            Long patientId,
            LocalDate startDate,
            LocalDate endDate) {

        List<Reminder> reminders = reminderRepository
                .findByPatientIdAndReminderDateBetween(patientId, startDate, endDate);

        return reminders.stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                .map(r -> {
                    Map<String, Object> event = new HashMap<>();
                    event.put("id", r.getIdReminder());
                    event.put("date", r.getReminderDate().toString());
                    event.put("type", r.getType().name());
                    event.put("title", r.getTitle() != null ? r.getTitle() : "");
                    event.put("status", r.getStatus().name());
                    return event;
                })
                .collect(Collectors.toList());
    }

    @Override
    public Reminder delayReminder(Long reminderId, LocalDate newDate, LocalTime newTime) {
        Reminder reminder = reminderRepository.findById(reminderId)
                .orElseThrow(() -> new EntityNotFoundException("Reminder not found"));

        reminder.setReminderDate(newDate);
        reminder.setReminderTime(newTime);
        reminder.setStatus(ReminderStatus.RESCHEDULED);
        reminder.setUpdatedAt(LocalDateTime.now());

        return reminderRepository.save(reminder);
    }

    // ========== UTILITAIRES ==========

    @Override
    public boolean existsReminderAtDateTime(Long patientId, LocalDate date, LocalTime time) {
        return reminderRepository.existsByPatientIdAndReminderDateAndReminderTime(
                patientId, date, time
        );
    }

    @Override
    public List<Reminder> getRecurringReminders(Long patientId) {
        return reminderRepository.findByPatientIdAndIsRecurringTrue(patientId);
    }
}

