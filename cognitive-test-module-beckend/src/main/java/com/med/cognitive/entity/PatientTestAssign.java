package com.med.cognitive.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patient_test_assignations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientTestAssign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "patient_id")
    private Long patientId;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "test_id")
    private CognitiveTest test;

    @NotNull
    @Column(name = "soignant_id")
    private Long soignantId;

    @Column(name = "accompagnant_id")
    private Long accompagnantId;

    @Column(name = "date_assignation")
    private LocalDateTime dateAssignation;

    @Column(name = "date_limite")
    private LocalDate dateLimite;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private AssignStatus status = AssignStatus.ASSIGNED;

    @PrePersist
    protected void onCreate() {
        dateAssignation = LocalDateTime.now();
        if (status == null) {
            status = AssignStatus.ASSIGNED;
        }
    }
}
