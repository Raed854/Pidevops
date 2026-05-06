package com.med.cognitive.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cognitive_tests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CognitiveTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Size(min = 3, max = 255)
    private String titre;

    private String description;

    @Enumerated(EnumType.STRING)
    private TypeTest type;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty_level")
    private DifficultyLevel difficultyLevel;

    @Column(name = "total_score")
    private Integer totalScore = 0;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "id_user")
    private String idUser;

    @JsonIgnore
    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestQuestion> questions = new ArrayList<>();

    // Enum for Test Type
    public enum TypeTest {
        MEMORY, LANGUAGE, REFLECTION, LOGIC, AUDIO, ATTENTION, DRAWING, PERSONNALISE
    }

    // Enum for Difficulty Level
    public enum DifficultyLevel {
        FACILE, MOYEN, AVANCE
    }

    public void calculateTotalScore() {
        if (questions != null) {
            this.totalScore = questions.stream()
                    .mapToInt(TestQuestion::getScore)
                    .sum();
        }
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
