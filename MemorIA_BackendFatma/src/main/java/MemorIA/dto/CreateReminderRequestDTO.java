package MemorIA.dto;

import MemorIA.entity.Planning.NotificationChannel;
import MemorIA.entity.Planning.Priority;
import MemorIA.entity.Planning.RecurrenceType;
import MemorIA.entity.Planning.ReminderType;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

/**
 * DTO de création d'un rappel avec support complet de la récurrence
 * et des canaux de notification.
 *
 * Exemple JSON :
 * {
 *   "patientId": 5,
 *   "title": "Médicament matin",
 *   "type": "MEDICATION",
 *   "reminderDate": "2026-03-04",
 *   "reminderTime": "08:00",
 *   "durationMinutes": 15,
 *   "priority": "HIGH",
 *   "recurrenceType": "DAILY",
 *   "recurrenceEndDate": "2026-06-04",
 *   "notificationChannels": ["PUSH", "SMS"],
 *   "description": "Doliprane 500mg",
 *   "instructions": "À prendre avec un grand verre d'eau"
 * }
 */
@Data
public class CreateReminderRequestDTO {

    // ── Champs obligatoires ──────────────────────────────────────────────────

    private Long patientId;
    private String title;

    private ReminderType type;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate reminderDate;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime reminderTime;

    // ── Champs optionnels ────────────────────────────────────────────────────

    private Integer durationMinutes;

    private Priority priority = Priority.NORMAL;

    private Integer criticalityLevel;

    private String description;

    private String instructions;  // stocké dans notes

    // ── Récurrence ───────────────────────────────────────────────────────────

    /**
     * Type de récurrence.
     * NONE    = rappel unique
     * DAILY   = quotidien (à partir de reminderDate)
     * WEEKLY  = hebdomadaire (même jour de semaine que reminderDate)
     * MONTHLY = mensuel (même jour du mois que reminderDate)
     */
    private RecurrenceType recurrenceType = RecurrenceType.NONE;

    /**
     * Date de fin de la série récurrente (optionnel).
     * Si null, la récurrence est infinie.
     */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate recurrenceEndDate;

    // ── Canaux de notification ───────────────────────────────────────────────

    /**
     * Ensemble des canaux activés pour ce rappel.
     * Valeurs possibles : PUSH, SMS, EMAIL, VOICE_CALL
     */
    private Set<NotificationChannel> notificationChannels = new HashSet<>();

    // ── Créateur ─────────────────────────────────────────────────────────────

    private Long createdById;

    /**
     * Destinataires des notifications.
     * Par defaut: patient = true, caregiver = false
     */
    private Boolean notifyPatient = true;
    private Boolean notifyCaregiver = false;
    private Long caregiverId;
}
