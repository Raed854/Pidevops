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
public class VisageResultDto {
    private Long resultId;
    private Long testId;
    private Long patientId;
    private Integer score;
    private Integer totalQuestions;
    private LocalDateTime completedAt;
    private List<VisageAnswerDto> answers;
    private String error;
    private Integer totalTime; // Total time in seconds
    
    public Integer getScorePercentage() {
        if (totalQuestions == null || totalQuestions == 0) return 0;
        return (score * 100) / totalQuestions;
    }
    
    public Double getAverageResponseTime() {
        if (answers == null || answers.isEmpty()) return 0.0;
        return answers.stream()
                .filter(a -> a.getResponseTime() != null)
                .mapToLong(VisageAnswerDto::getResponseTime)
                .average()
                .orElse(0.0);
    }
}
