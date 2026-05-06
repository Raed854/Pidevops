package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.util.List;

public class ReminderDTO {
    private Long id;
    private Long idReminder;
    private String title;
    private String description;
    private String type;
    private String status;
    private String priority;
    private Integer criticalityLevel;
    private Boolean isRecurring;
    private String recurrenceType;
    private String recurrenceEndDate;
    private List<String> notificationChannels;
    private Long patientId;
    private String patientName;
    private String notes;
    private Integer durationMinutes;
    private Boolean isActive;
    private String reminderDate;
    private String reminderTime;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") private String scheduledTime;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") private String createdAt;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") private String updatedAt;

    // ── Getters & Setters ────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getIdReminder() { return idReminder; }
    public void setIdReminder(Long idReminder) { this.idReminder = idReminder; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public Integer getCriticalityLevel() { return criticalityLevel; }
    public void setCriticalityLevel(Integer criticalityLevel) { this.criticalityLevel = criticalityLevel; }

    public Boolean getIsRecurring() { return isRecurring; }
    public void setIsRecurring(Boolean isRecurring) { this.isRecurring = isRecurring; }

    public String getRecurrenceType() { return recurrenceType; }
    public void setRecurrenceType(String recurrenceType) { this.recurrenceType = recurrenceType; }

    public String getRecurrenceEndDate() { return recurrenceEndDate; }
    public void setRecurrenceEndDate(String recurrenceEndDate) { this.recurrenceEndDate = recurrenceEndDate; }

    public List<String> getNotificationChannels() { return notificationChannels; }
    public void setNotificationChannels(List<String> notificationChannels) { this.notificationChannels = notificationChannels; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public String getReminderDate() { return reminderDate; }
    public void setReminderDate(String reminderDate) { this.reminderDate = reminderDate; }

    public String getReminderTime() { return reminderTime; }
    public void setReminderTime(String reminderTime) { this.reminderTime = reminderTime; }

    public String getScheduledTime() { return scheduledTime; }
    public void setScheduledTime(String scheduledTime) { this.scheduledTime = scheduledTime; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
