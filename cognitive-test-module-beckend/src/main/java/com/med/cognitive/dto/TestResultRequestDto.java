package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestResultRequestDto {

    private Long patientId;
    private Long testId;
    private Long assignationId;
    private Integer score;
    private List<AnswerRequestDto> answers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerRequestDto {
        private Long questionId;
        private Long answerId;
        private Boolean correct;
    }
}
