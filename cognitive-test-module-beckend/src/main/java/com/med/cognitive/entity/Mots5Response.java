package com.med.cognitive.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "mots5_responses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Mots5Response {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "mots5_test_id")
    private Mots5Test mots5Test;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "mot5_item_id")
    private Mot5Item motItem;

    @Column(name = "answer_text")
    private String answerText;

    @Column(name = "is_correct")
    private Boolean isCorrect = false;

    @Column(name = "score_obtained")
    private Integer scoreObtained = 0;

    @Column(name = "time_taken_seconds")
    private Integer timeTakenSeconds;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "phase")
    private ResponsePhase phase;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    public enum ResponsePhase {
        RAPPEL_IMMEDIAT,
        RAPPEL_LIBRE,
        RAPPEL_INDICE
    }
}
