package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisageScoreRequestDto {
    private Long testId;
    private Long patientId;
    private Integer score;
}
