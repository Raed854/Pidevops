package MemorIA.entity;

import MemorIA.entity.role.AccessLevel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "administrateur")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Administrateur {

    @Id
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "niveau_acces", nullable = false)
    private AccessLevel niveauAcces;

    private String departement;

    @Column(name = "droits_speciaux", columnDefinition = "TEXT")
    private String droitsSpeciaux;

    @Column(name = "responsable_au")
    private String responsableAu;

    @Column(name = "date_debut_mandat")
    private LocalDate dateDebutMandat;

    @Column(name = "date_fin_mandat")
    private LocalDate dateFinMandat;
}
