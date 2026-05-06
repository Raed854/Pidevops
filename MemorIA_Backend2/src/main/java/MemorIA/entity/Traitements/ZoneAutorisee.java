package MemorIA.entity.Traitements;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;

@Entity
@Table(name = "zone_autorisee")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ZoneAutorisee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idZoneAutorisee;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false)
    private Integer rayon;

    @Column(nullable = false)
    private Boolean actif;

    @Column(name = "date_mise_a_jour", nullable = false)
    private LocalDateTime dateMiseAJour;

    @ManyToOne
    @JoinColumn(name = "id_traitement", nullable = false)
    @JsonIgnore
    private Traitements traitements;
}
