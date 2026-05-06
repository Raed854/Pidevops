package MemorIA.service;

import MemorIA.dto.AdherenceStatsDTO;
import MemorIA.dto.PatientAssignmentDTO;
import MemorIA.entity.CaregiverLink;
import MemorIA.entity.Patient;
import MemorIA.entity.Planning.Reminder;
import MemorIA.entity.Planning.ReminderStatus;
import MemorIA.entity.User;
import MemorIA.repository.CaregiverLinkRepository;
import MemorIA.repository.PatientRepository;
import MemorIA.repository.ReminderRepository;
import MemorIA.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PlanningServiceImpl implements IPlanningService {

    @Autowired
    private ReminderRepository reminderRepository;

    @Autowired
    private CaregiverLinkRepository caregiverLinkRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private IAdherenceService adherenceService;

    @Autowired
    private PatientRepository patientRepository;

    @Override
    public List<Patient> getDoctorPatients(Long doctorId) {
        // Récupère tous les patients actifs
        // TODO: Implémenter une vraie relation doctor-patient
        return patientRepository.findByActifTrue();
    }

    @Override
    public List<PatientAssignmentDTO> getCaregiverPatients(Long caregiverId) {
        List<CaregiverLink> links = caregiverLinkRepository.findByCaregiverId(caregiverId);
        return links.stream()
                .map(link -> {
                    PatientAssignmentDTO dto = new PatientAssignmentDTO();
                    dto.setId(link.getId());
                    dto.setPatientId(link.getPatient().getId());
                    dto.setCaregiverId(link.getCaregiver().getId());
                    dto.setStatus(link.getStatus());
                    dto.setIsPrimary(link.getIsPrimary());
                    if (link.getAssignedDate() != null) {
                        dto.setAssignedDate(link.getAssignedDate().toString());
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<Reminder> getRemindersForDate(Long patientId, LocalDate date) {
        return reminderRepository.findByPatientIdAndReminderDateAndIsActiveTrue(patientId, date);
    }

    @Override
    public List<Map<String, Object>> getCalendarEvents(Long patientId, LocalDate startDate, LocalDate endDate) {
        List<Reminder> reminders = reminderRepository.findByPatientIdAndReminderDateBetween(
                patientId, startDate, endDate
        );

        return reminders.stream()
                .map(reminder -> {
                    Map<String, Object> event = new HashMap<>();
                    event.put("id", reminder.getIdReminder());
                    event.put("title", reminder.getTitle());
                    event.put("date", reminder.getReminderDate());
                    event.put("time", reminder.getReminderTime());
                    event.put("type", reminder.getType());
                    event.put("status", reminder.getStatus());
                    event.put("description", reminder.getDescription());
                    return event;
                })
                .collect(Collectors.toList());
    }

    @Override
    public AdherenceStatsDTO getAdherenceStats(Long patientId, Integer days) {
        return adherenceService.calculateAdherenceStats(patientId, days);
    }

    @Override
    public Reminder confirmReminder(Long reminderId) {
        Reminder reminder = reminderRepository.findById(reminderId)
                .orElseThrow(() -> new EntityNotFoundException("Rappel introuvable"));

        reminder.setStatus(ReminderStatus.CONFIRMED);
        reminder.setUpdatedAt(LocalDateTime.now());
        return reminderRepository.save(reminder);
    }

    @Override
    public Reminder delayReminder(Long reminderId, LocalDate newDate, LocalTime newTime) {
        Reminder reminder = reminderRepository.findById(reminderId)
                .orElseThrow(() -> new EntityNotFoundException("Rappel introuvable"));

        reminder.setReminderDate(newDate);
        reminder.setReminderTime(newTime);
        reminder.setStatus(ReminderStatus.RESCHEDULED);
        reminder.setUpdatedAt(LocalDateTime.now());
        return reminderRepository.save(reminder);
    }

    @Override
    public void deleteReminder(Long reminderId) {
        Reminder reminder = reminderRepository.findById(reminderId)
                .orElseThrow(() -> new EntityNotFoundException("Rappel introuvable"));

        reminder.setIsActive(false);
        reminder.setDeletedAt(LocalDateTime.now());
        reminderRepository.save(reminder);
    }

    @Override
    public Reminder createReminder(Reminder reminder) {
        reminder.setIsActive(true);
        reminder.setCreatedAt(LocalDateTime.now());
        reminder.setUpdatedAt(LocalDateTime.now());

        if (reminder.getStatus() == null) {
            reminder.setStatus(ReminderStatus.PENDING);
        }

        return reminderRepository.save(reminder);
    }

    @Override
    public int autoDelayPendingReminders(Long patientId) {
        List<Reminder> pendingReminders = reminderRepository
                .findByPatientIdAndStatus(patientId, ReminderStatus.PENDING)
                .stream()
                .filter(r -> r.getReminderDate() != null && r.getReminderDate().isBefore(LocalDate.now()))
                .collect(Collectors.toList());

        LocalDate tomorrow = LocalDate.now().plusDays(1);
        for (Reminder reminder : pendingReminders) {
            reminder.setReminderDate(tomorrow);
            reminder.setStatus(ReminderStatus.RESCHEDULED);
            reminder.setUpdatedAt(LocalDateTime.now());
            reminderRepository.save(reminder);
        }

        return pendingReminders.size();
    }

    @Override
    public byte[] generateWeeklyPlanningPDF(Long patientId) {
        // TODO: Implémenter la génération de PDF
        // Pour maintenant, retourner un tableau vide
        return new byte[0];
    }
}
