package MemorIA.entity.Traitements;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


import java.time.LocalDateTime;

@Entity
@Table(name = "historique_position")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoriquePosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idHistoriquePosition;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "duree_arret_minute")
    private Integer dureeArretMinute;

    @Column(name = "heure_arrive")
    private LocalDateTime heureArrive;

    @Column(name = "heure_depart")
    private LocalDateTime heureDepart;

    @Column(name = "distance_point_precedent")
    private Double distancePointPrecedent;

    @Column(name = "distance_point_suivant")
    private Double distancePointSuivant;

    @Column(name = "date_enregistrement", nullable = false)
    private LocalDateTime dateEnregistrement;

    @ManyToOne
    @JoinColumn(name = "id_traitement", nullable = false)
    private Traitements traitements;
}
