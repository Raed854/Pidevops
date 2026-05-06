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
public class TestWithQuestionsDto {

    private Long testId;
    private String testName;
    private String testType;
    private String difficultyLevel;
    private Integer durationMinutes;
    private List<QuestionDto> questions;
    
    // 5 mots test specific fields
    private Boolean is5MotsTest = false;
    private Boolean isVisagesTest = false;
    private Boolean isMotsCroisesTest = false;
    private Long patientId;
    private String patientName;
    private String redirectUrl;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionDto {
        private Long id;
        private String questionText;
        private String questionType;
        private String imageUrl;
        private List<AnswerDto> answers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerDto {
        private Long id;
        private String answerText;
        private String imageUrl;
        private Boolean isCorrect;
        private Integer orderIndex;
    }
}
