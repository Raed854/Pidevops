package MemorIA.dto;

import MemorIA.entity.alerts.Alert;
import MemorIA.entity.alerts.AlertType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateAlertRequest(
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 1200) String description,
        @NotNull AlertType type,
        @NotNull Alert.AlertSeverity severity,
        Long assignedToUserId,
        Long patientId
) {
}
