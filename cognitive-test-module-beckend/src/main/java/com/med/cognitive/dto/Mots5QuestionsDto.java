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
public class Mots5QuestionsDto {
    private Long testId;
    private List<Mot5WordDto> words;
    private String currentPhase;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Mot5WordDto {
        private Long id;
        private String word;
        private String category;
        private Integer orderIndex;
    }
}
