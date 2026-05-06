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
public class Mots5ResponseDto {
    private Long mots5TestId;
    private Long motItemId;
    private String answerText;
    private String phase;
    private Integer timeTakenSeconds;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchResponseDto {
        private Long mots5TestId;
        private String phase;
        private List<SingleResponseDto> responses;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SingleResponseDto {
        private Long motItemId;
        private String answerText;
        private Integer timeTakenSeconds;
    }
}
