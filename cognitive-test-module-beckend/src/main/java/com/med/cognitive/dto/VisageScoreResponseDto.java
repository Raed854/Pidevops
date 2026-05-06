package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisageScoreResponseDto {
    private boolean success;
    private String message;
    private Long resultId;
    private Integer score;
}
