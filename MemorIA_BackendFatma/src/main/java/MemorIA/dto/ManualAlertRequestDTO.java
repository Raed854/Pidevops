package MemorIA.dto;

import MemorIA.entity.alerts.AlertType;
import MemorIA.entity.alerts.Alert;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

/**
 * DTO for caregiver manual alert creation
 * Allows caregivers to create manual alerts for their patients
 */
public record ManualAlertRequestDTO(
        @JsonProperty("patient_id")
        Long patientId,

        @JsonProperty("type")
        AlertType type,

        @JsonProperty("title")
        String title,

        @JsonProperty("description")
        String description,

        @JsonProperty("severity")
        Alert.AlertSeverity severity,

        @JsonProperty("created_at")
        LocalDateTime createdAt,

        @JsonProperty("notify_doctor")
        boolean notifyDoctor
) {
}
