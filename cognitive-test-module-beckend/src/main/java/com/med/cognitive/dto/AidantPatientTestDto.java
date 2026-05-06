package com.med.cognitive.dto;

import java.time.LocalDateTime;

public record AidantPatientTestDto(
        Long patientId,
        String patientName,
        Long testId,
        String testName,
        String status,
        LocalDateTime assignedDate
) {
}
