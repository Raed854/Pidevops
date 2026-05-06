package MemorIA.mapper;

import MemorIA.dto.ReminderDTO;
import MemorIA.entity.Planning.Reminder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

@Component
public class ReminderMapper {

    private static final DateTimeFormatter ISO_FORMATTER  = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    public ReminderDTO toDTO(Reminder reminder) {
        if (reminder == null) return null;

        ReminderDTO dto = new ReminderDTO();

        // ── IDs (les deux champs pour compatibilité frontend)
        dto.setId(reminder.getIdReminder());
        dto.setIdReminder(reminder.getIdReminder());

        dto.setTitle(reminder.getTitle());
        dto.setDescription(reminder.getDescription());

        // ── Enums : type en MAJUSCULES, status en minuscules (cohérence frontend Angular)
        dto.setType(reminder.getType()     != null ? reminder.getType().name()               : "OTHER");
        dto.setStatus(reminder.getStatus() != null ? reminder.getStatus().name().toLowerCase() : "pending");
        dto.setPriority(reminder.getPriority() != null ? reminder.getPriority().name().toLowerCase() : "normal");

        // ── Récurrence
        dto.setRecurrenceType(reminder.getRecurrenceType() != null
                ? reminder.getRecurrenceType().name() : "NONE");
        if (reminder.getRecurrenceEndDate() != null) {
            dto.setRecurrenceEndDate(reminder.getRecurrenceEndDate().format(DATE_FORMATTER));
        }

        // ── Canaux de notification (liste de strings)
        if (reminder.getNotificationChannels() != null && !reminder.getNotificationChannels().isEmpty()) {
            dto.setNotificationChannels(
                reminder.getNotificationChannels().stream()
                    .map(Enum::name)
                    .collect(Collectors.toList())
            );
        }

        // ── Date et heure séparés (utilisés par CalendarViewComponent et DayDetailModal)
        if (reminder.getReminderDate() != null) {
            dto.setReminderDate(reminder.getReminderDate().format(DATE_FORMATTER));
        }
        if (reminder.getReminderTime() != null) {
            dto.setReminderTime(reminder.getReminderTime().format(TIME_FORMATTER));
        }

        // ── scheduledTime combiné ISO 8601 (conservé pour compatibilité)
        if (reminder.getReminderDate() != null && reminder.getReminderTime() != null) {
            LocalDateTime scheduledDateTime = LocalDateTime.of(
                reminder.getReminderDate(),
                reminder.getReminderTime()
            );
            dto.setScheduledTime(scheduledDateTime.format(ISO_FORMATTER));
        }

        dto.setDurationMinutes(reminder.getDurationMinutes());
        dto.setCriticalityLevel(reminder.getCriticalityLevel());
        dto.setIsRecurring(reminder.getIsRecurring() != null ? reminder.getIsRecurring() : false);
        dto.setIsActive(reminder.getIsActive() != null ? reminder.getIsActive() : true);
        dto.setPatientId(reminder.getPatientId());
        dto.setNotes(reminder.getNotes());

        if (reminder.getCreatedAt() != null) {
            dto.setCreatedAt(reminder.getCreatedAt().format(ISO_FORMATTER));
        }
        if (reminder.getUpdatedAt() != null) {
            dto.setUpdatedAt(reminder.getUpdatedAt().format(ISO_FORMATTER));
        }

        return dto;
    }
}
