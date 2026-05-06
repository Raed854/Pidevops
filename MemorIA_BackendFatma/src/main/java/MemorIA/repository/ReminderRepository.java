package MemorIA.repository;

import MemorIA.entity.Planning.Reminder;
import MemorIA.entity.Planning.ReminderStatus;
import MemorIA.entity.Planning.ReminderType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface ReminderRepository extends CrudRepository<Reminder, Long> {

    // ...existing code...

    /**
     * Récupère tous les rappels actifs (PLANNED ou PENDING) dont la date est aujourd'hui
     * et l'heure est comprise entre [from, to].
     * Utilisé par le scheduler toutes les minutes pour déclencher les notifications.
     */
    @Query("SELECT r FROM Reminder r WHERE r.reminderDate = :date " +
           "AND r.reminderTime BETWEEN :from AND :to " +
           "AND r.isActive = true " +
           "AND r.status IN :statuses")
    List<Reminder> findRemindersToNotify(
            @Param("date")     LocalDate date,
            @Param("from")     LocalTime from,
            @Param("to")       LocalTime to,
            @Param("statuses") List<ReminderStatus> statuses
    );

    /**
     * Reminders manqués : date < aujourd'hui OU (date = aujourd'hui ET heure < threshold)
     * status encore PLANNED/PENDING → à passer à MISSED automatiquement.
     */
    @Query("SELECT r FROM Reminder r WHERE r.isActive = true " +
           "AND r.status IN :statuses " +
           "AND (r.reminderDate < :today " +
           "OR (r.reminderDate = :today AND r.reminderTime < :threshold))")
    List<Reminder> findOverdueReminders(
            @Param("today")     LocalDate today,
            @Param("threshold") LocalTime threshold,
            @Param("statuses")  List<ReminderStatus> statuses
    );
    List<Reminder> findByPatientIdAndIsActiveTrue(Long patientId);

    // Par date
    List<Reminder> findByPatientIdAndReminderDateBetween(
            Long patientId, LocalDate startDate, LocalDate endDate
    );

    List<Reminder> findByReminderDateBetween(LocalDate startDate, LocalDate endDate);

    List<Reminder> findByPatientIdAndReminderDate(Long patientId, LocalDate date);

    List<Reminder> findByPatientIdAndReminderDateAndIsActiveTrue(
            Long patientId, LocalDate date
    );

    // Par statut
    List<Reminder> findByStatus(ReminderStatus status);
    List<Reminder> findByPatientIdAndStatus(Long patientId, ReminderStatus status);

    // Par type
    List<Reminder> findByPatientIdAndType(Long patientId, ReminderType type);

    // Comptage
    Long countByPatientIdAndStatus(Long patientId, ReminderStatus status);

    Long countByPatientIdAndStatusAndReminderDateBetween(
            Long patientId, ReminderStatus status, LocalDate startDate, LocalDate endDate
    );

    // Vérifications
    boolean existsByPatientIdAndReminderDateAndReminderTime(
            Long patientId, LocalDate date, LocalTime time
    );

    // Récurrence
    List<Reminder> findByPatientIdAndIsRecurringTrue(Long patientId);
}