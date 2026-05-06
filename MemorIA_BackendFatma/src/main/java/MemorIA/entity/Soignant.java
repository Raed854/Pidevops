package MemorIA.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;

@Entity
@Table(name = "soignant")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Soignant {

    @Id
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "id")
    private User user;

    @Column(name = "numero_ordre", unique = true, nullable = false)
    private String numeroOrdre;

    @Column(nullable = false)
    private String specialite;

    @Column(nullable = false)
    private String hopital;

    @Column(name = "numero_telephone2")
    private String numeroTelephone2;

    @Column(columnDefinition = "TEXT")
    private String diplomes;

    @Column(name = "annees_experience")
    private Integer anneesExperience;

    @Column(columnDefinition = "TEXT")
    private String biographie;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "date_debut_exercice")
    private LocalDate dateDebutExercice;
}
