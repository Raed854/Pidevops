package com.med.cognitive.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "mots5_test")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Mots5Test {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cognitive_test_id")
    private CognitiveTest cognitiveTest;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "assignation_id")
    private Long assignationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_phase")
    private Mots5Phase currentPhase = Mots5Phase.ENCODAGE;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "score_total")
    private Integer scoreTotal = 0;

    @Column(name = "is_completed")
    private Boolean isCompleted = false;

    public enum Mots5Phase {
        ENCODAGE,
        RAPPEL_IMMEDIAT,
        DISTRACTEUR,
        RAPPEL_LIBRE,
        RAPPEL_INDICE,
        TERMINE
    }
}
