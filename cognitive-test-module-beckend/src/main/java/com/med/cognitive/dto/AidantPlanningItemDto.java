package com.med.cognitive.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AidantPlanningItemDto(
        Long id,
        Long patientId,
        Long accompagnantId,
        Long soignantId,
        Long testId,
        String testTitre,
        String testType,
        String status,
        LocalDateTime dateAssignation,
        LocalDate dateLimite
) {
}
