package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisageAnswerDto {
    private Long questionId;
    private String selectedImage;
    private String correctImage;
    private Long patientId;
    private Long testId;
    private Long responseTime; // Time taken to answer in milliseconds
}
