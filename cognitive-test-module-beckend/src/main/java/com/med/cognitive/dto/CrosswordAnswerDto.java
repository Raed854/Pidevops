package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrosswordAnswerDto {
    private Long questionId;
    private String answer;
    private Long patientId;
    private Long testId;
    private Integer row;
    private Integer col;
    private String direction; // horizontal or vertical
}
