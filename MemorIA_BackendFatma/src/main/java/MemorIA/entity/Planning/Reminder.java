package MemorIA.entity.Planning;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import MemorIA.config.LocalTimeDeserializer;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "reminder")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Reminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reminder")
    private Long idReminder;

    @Column(name = "title")
    private String title;

    @Column(name = "description", length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 50)
    private ReminderType type;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "reminder_date")
    private LocalDate reminderDate;

    @JsonFormat(pattern = "HH:mm:ss")
    @JsonDeserialize(using = LocalTimeDeserializer.class)
    @Column(name = "reminder_time")
    private LocalTime reminderTime;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private ReminderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 20)
    private Priority priority;

    @Column(name = "criticality_level")
    private Integer criticalityLevel;

    @Column(name = "is_recurring", columnDefinition = "TINYINT(1)")
    private Boolean isRecurring;

    /**
     * Type de récurrence : NONE, DAILY, WEEKLY, MONTHLY
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "recurrence_type", length = 20)
    private RecurrenceType recurrenceType = RecurrenceType.NONE;

    /**
     * Date de fin de récurrence (null = pas de fin définie)
     */
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "recurrence_end_date")
    private LocalDate recurrenceEndDate;

    /**
     * Canaux de notification activés (PUSH, SMS, EMAIL, VOICE_CALL)
     * Stocké comme une chaîne séparée par des virgules en base de données
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "reminder_channels",
        joinColumns = @JoinColumn(name = "reminder_id")
    )
    @Column(name = "channel")
    @Enumerated(EnumType.STRING)
    private Set<NotificationChannel> notificationChannels = new HashSet<>();

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "created_by_id")
    private Long createdById;

    @Column(name = "confirmed_by_id")
    private Long confirmedById;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "confirmation_time")
    private LocalDateTime confirmationTime;

    @Column(name = "is_late_confirmation", columnDefinition = "TINYINT(1)")
    private Boolean isLateConfirmation;

    @Column(name = "notes", length = 500)
    private String notes;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_active", columnDefinition = "TINYINT(1)")
    private Boolean isActive;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * Destinataires de notification:
     * - notifyPatient: notifier le patient
     * - notifyCaregiver: notifier l'aidant
     * - caregiverId: aidant cible (optionnel)
     */
    @Column(name = "notify_patient", columnDefinition = "TINYINT(1)")
    private Boolean notifyPatient = true;

    @Column(name = "notify_caregiver", columnDefinition = "TINYINT(1)")
    private Boolean notifyCaregiver = false;

    @Column(name = "caregiver_id")
    private Long caregiverId;
}