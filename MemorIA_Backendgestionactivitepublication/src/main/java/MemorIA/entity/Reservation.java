package MemorIA.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "reservations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "seance_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"reservations"})
    private Seance seance;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "accompagnant_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"password", "diagnostics"})
    private User accompagnant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutReservation statut = StatutReservation.ACCEPTEE;

    @Column(nullable = false)
    private LocalDateTime dateReservation = LocalDateTime.now();
}
