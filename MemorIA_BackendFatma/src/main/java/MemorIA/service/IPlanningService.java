package MemorIA.service;

import MemorIA.dto.AdherenceStatsDTO;
import MemorIA.dto.PatientAssignmentDTO;
import MemorIA.entity.Planning.Reminder;
import MemorIA.entity.Patient;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public interface IPlanningService {

    /**
     * Retrieves the doctor's patients
     */
    List<Patient> getDoctorPatients(Long doctorId);

    /**
     * Retrieves patients assigned to a caregiver
     */
    List<PatientAssignmentDTO> getCaregiverPatients(Long caregiverId);

    /**
     * Retrieves reminders for a patient on a given date
     */
    List<Reminder> getRemindersForDate(Long patientId, LocalDate date);

    /**
     * Retrieves calendar events for a date range
     */
    List<Map<String, Object>> getCalendarEvents(Long patientId, LocalDate startDate, LocalDate endDate);

    /**
     * Retrieves adherence statistics for a patient
     */
    AdherenceStatsDTO getAdherenceStats(Long patientId, Integer days);

    /**
     * Confirms a reminder
     */
    Reminder confirmReminder(Long reminderId);

    /**
     * Postpones a reminder to a new date/time
     */
    Reminder delayReminder(Long reminderId, LocalDate newDate, LocalTime newTime);

    /**
     * Supprime un rappel (soft delete)
     */
    void deleteReminder(Long reminderId);

    /**
     * Crée un nouveau rappel
     */
    Reminder createReminder(Reminder reminder);

    /**
     * Reporte automatiquement tous les rappels PENDING
     */
    int autoDelayPendingReminders(Long patientId);

    /**
     * Génère un PDF du planning hebdomadaire
     */
    byte[] generateWeeklyPlanningPDF(Long patientId);
}
