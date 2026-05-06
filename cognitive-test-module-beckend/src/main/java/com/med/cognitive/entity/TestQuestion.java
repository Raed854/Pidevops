package com.med.cognitive.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "test_questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id")
    @JsonIgnore
    private CognitiveTest test;

    @NotNull
    @Column(name = "question_text")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type")
    private QuestionType questionType;

    @Column(name = "correct_answer")
    private String correctAnswer;

    @ElementCollection
    @CollectionTable(name = "question_answer_options", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "option_text")
    private List<String> answerOptions;

    private Integer score = 1;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "time_limit_seconds")
    private Integer timeLimitSeconds;

    @Column(name = "image_url")
    private String imageUrl;

    private String explanation;

    @Column(name = "is_required")
    private Boolean isRequired = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Enum for Question Type
    public enum QuestionType {
        MCQ, TEXT, IMAGE, TRUE_FALSE, NUMERIC, DRAWING, AUDIO
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
