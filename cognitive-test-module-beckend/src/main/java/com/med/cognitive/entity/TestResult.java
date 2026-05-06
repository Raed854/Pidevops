package com.med.cognitive.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "test_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Existing fields for backward compatibility
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "test_date")
    private LocalDateTime testDate;

    @Column(name = "score_totale")
    private Integer scoreTotale;

    @Column(name = "max_possible_score")
    private Integer maxPossibleScore;

    @Column(name = "score_percentage")
    private Double scorePercentage;

    /** z-score individuel calculé au moment de la complétion du test */
    @Column(name = "z_score")
    private Double zScore;

    @Column(name = "completion_rate")
    private Double completionRate;

    @Column(name = "is_valid")
    private Boolean isValid = true;

    @Column(name = "flagged_reasons")
    private String flaggedReasons;

    private String interpretation;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity_level")
    private SeverityLevel severityLevel;

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @ManyToOne
    @JoinColumn(name = "test_id")
    private CognitiveTest test;

    // New fields for the test assignment system
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assign_id")
    private PatientTestAssign assignation;

    @Column(name = "accompagnant_id_assign")
    private Long accompagnantId; // Who helped during the test (Long for new module)

    @Column(name = "date_debut")
    private LocalDateTime dateDebut;

    @Column(name = "date_fin")
    private LocalDateTime dateFin;

    // We'll use scoreTotal and scoreMax as aliases for scoreTotale and
    // maxPossibleScore or vice versa
    // In many cases, it's better to keep them separate if the data types differ or
    // if they represent different things.
    // Given the request, I'll keep the new fields too but try to keep them
    // consistent in the set methods if possible.

    @Column(name = "observations")
    private String observations;

    @JsonIgnore
    @OneToMany(mappedBy = "testResult", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestAnswer> answers = new ArrayList<>();

    public enum SeverityLevel {
        NORMAL, MILD, MODERATE, SEVERE
    }

    @PrePersist
    protected void onCreate() {
        if (dateDebut == null)
            dateDebut = LocalDateTime.now();
        if (testDate == null)
            testDate = LocalDateTime.now();
    }

    // Helper to keep scores in sync if needed
    public Integer getScoreTotal() {
        return scoreTotale;
    }

    public void setScoreTotal(Integer score) {
        this.scoreTotale = score;
    }

    public Integer getScoreMax() {
        return maxPossibleScore;
    }

    public void setScoreMax(Integer max) {
        this.maxPossibleScore = max;
    }
}
