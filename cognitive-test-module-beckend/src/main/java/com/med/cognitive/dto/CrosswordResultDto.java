package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrosswordResultDto {
    private Long resultId;
    private Long testId;
    private Long patientId;
    private Integer score;
    private Integer totalQuestions;
    private LocalDateTime completedAt;
    private List<CrosswordAnswerDto> answers;
    private String error;
    
    public Integer getScorePercentage() {
        if (totalQuestions == null || totalQuestions == 0) return 0;
        return (score * 100) / totalQuestions;
    }
}
