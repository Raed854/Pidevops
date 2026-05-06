package MemorIA.service;

import MemorIA.dto.CreateReminderRequestDTO;
import MemorIA.entity.Planning.Reminder;
import MemorIA.entity.Planning.ReminderStatus;
import MemorIA.entity.Planning.ReminderType;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface IReminderService {

    // CRUD
    Reminder addReminder(Reminder reminder);
    Reminder updateReminder(Reminder reminder);
    void deleteReminder(Long idReminder);
    Optional<Reminder> getReminderById(Long idReminder);
    List<Reminder> getAllReminders();

    // ── Creation via DTO (with recurrence) ──────────────────────────────────

    /**
     * Creates a reminder from the DTO.
     * If recurrenceType != NONE, generates all recurring occurrences.
     * Returns the list of all reminders created (1 if NONE, N if recurring).
     */
    List<Reminder> createReminderWithRecurrence(CreateReminderRequestDTO dto);

    /**
     * Generates and persists recurring occurrences of a master reminder.
     *
     * Rules:
     *  - DAILY   : one reminder per day from startDate until endDate (or +1 year if endDate null)
     *  - WEEKLY  : one reminder per week, same dayOfWeek as startDate
     *  - MONTHLY : one reminder per month, same dayOfMonth as startDate
     *
     * @param master   The master reminder (already persisted, serves as model)
     * @param endDate  Recurrence end date (null = +1 year by default)
     * @return list of all generated occurrences
     */
    List<Reminder> generateRecurringOccurrences(Reminder master, LocalDate endDate);

    // Patient search
    List<Reminder> getRemindersByPatient(Long patientId);
    List<Reminder> getRemindersByPatientBetweenDates(Long patientId, LocalDate startDate, LocalDate endDate);
    List<Reminder> getRemindersByPatientAndDate(Long patientId, LocalDate date);
    List<Reminder> getRemindersByPatientAndType(Long patientId, ReminderType type);

    // Status search
    List<Reminder> getRemindersByStatus(ReminderStatus status);
    List<Reminder> getRemindersByPatientAndStatus(Long patientId, ReminderStatus status);

    // Date search
    List<Reminder> getRemindersBetweenDates(LocalDate startDate, LocalDate endDate);
    List<Reminder> getTodayReminders(Long patientId);

    // Counting
    Long countRemindersByPatientAndStatus(Long patientId, ReminderStatus status);
    Long countRemindersByPatientStatusAndDateRange(
            Long patientId, ReminderStatus status, LocalDate startDate, LocalDate endDate
    );

    // Status updates
    void markAsConfirmed(Long idReminder);
    void markAsMissed(Long idReminder);
    void markAsCanceled(Long idReminder, String reason);

    // Utilities
    boolean existsReminderAtDateTime(Long patientId, LocalDate date, LocalTime time);
    List<Reminder> getRecurringReminders(Long patientId);

    // Planning
    List<Map<String, Object>> getCalendarEvents(Long patientId, LocalDate startDate, LocalDate endDate);
    Reminder delayReminder(Long reminderId, LocalDate newDate, LocalTime newTime);
}

