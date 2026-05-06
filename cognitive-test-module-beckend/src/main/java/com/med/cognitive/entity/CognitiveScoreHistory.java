package com.med.cognitive.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "cognitive_score_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CognitiveScoreHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "test_result_id")
    private Long testResultId;

    @NotNull
    @Column(name = "global_score")
    private Integer globalScore;

    @Column(name = "memory_score")
    private Integer memoryScore;

    @Column(name = "attention_score")
    private Integer attentionScore;

    @Column(name = "language_score")
    private Integer languageScore;

    @Column(name = "executive_score")
    private Integer executiveScore;

    @Column(name = "evaluation_date")
    private LocalDateTime evaluationDate;

    @Enumerated(EnumType.STRING)
    private TrendType trend;

    @Column(name = "trend_magnitude")
    private Double trendMagnitude;

    private String notes;

    @Column(name = "evaluated_by")
    private String evaluatedBy;

    public enum TrendType {
        STABLE, DECLINE, IMPROVEMENT
    }
}
