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
public class Mots5ResultatsDto {
    private Long mots5TestId;
    private Long patientId;
    private String currentPhase;
    private Boolean isCompleted;
    private Integer scoreTotal;
    private Integer scoreMax;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String interpretation;
    private List<Mot5ResultDto> results;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Mot5ResultDto {
        private Long motItemId;
        private String word;
        private String category;
        private Boolean rappelLibre;
        private Boolean rappelIndice;
        private Integer score;
        private String rappelLibreReponse;
        private String rappelIndiceReponse;
    }
}
