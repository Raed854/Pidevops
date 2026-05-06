package MemorIA.entity.Traitements;

import MemorIA.entity.role.StatutDisponibilite;
import MemorIA.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "disponibilite")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Disponibilite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDisponibilite;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "heure_debut", nullable = false)
    private LocalTime heureDebut;

    @Column(name = "heure_fin", nullable = false)
    private LocalTime heureFin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutDisponibilite statut;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_user", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_patient")
    @JsonIgnore
    @ToString.Exclude
    private User patient;

    /**
     * Used only for deserializing POST requests.
     * The frontend sends {"userId": 3, ...} and the service looks up the User entity.
     */
    @Transient
    @JsonProperty(value = "userId", access = JsonProperty.Access.WRITE_ONLY)
    private Long userId;
}
