package com.med.cognitive.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class AssignationRequest {
    private Long patientId;
    private Long testId;
    private Long soignantId;
    private Long accompagnantId;
    private LocalDate dateLimite;
    private String instructions;
}
