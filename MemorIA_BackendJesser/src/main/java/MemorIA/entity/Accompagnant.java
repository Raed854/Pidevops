package MemorIA.entity;

import MemorIA.entity.role.FrequenceAccompagnement;
import MemorIA.entity.role.LienPatient;
import MemorIA.entity.role.SituationPro;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "accompagnant")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Accompagnant {

    @Id
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "lien_patient", nullable = false)
    private LienPatient lienPatient;

    @Column(name = "date_naissance", nullable = false)
    private LocalDate dateNaissance;

    private String adresse;

    @Column(name = "code_postal")
    private String codePostal;

    private String ville;

    @Column(name = "telephone_secours")
    private String telephoneSecours;

    @Enumerated(EnumType.STRING)
    @Column(name = "situation_pro")
    private SituationPro situationPro;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequence_accompagnement", nullable = false)
    private FrequenceAccompagnement frequenceAccompagnement;
}
