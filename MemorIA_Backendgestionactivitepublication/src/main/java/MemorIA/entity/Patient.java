package MemorIA.entity;

import MemorIA.entity.role.GroupeSanguin;
import MemorIA.entity.role.Sexe;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "patient")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Patient {

    @Id
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "id")
    private User user;

    @Column(name = "date_naissance", nullable = false)
    private LocalDate dateNaissance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Sexe sexe;

    @Column(name = "numero_securite_sociale", unique = true, nullable = false)
    private String numeroSecuriteSociale;

    private String adresse;

    private String ville;

    @Enumerated(EnumType.STRING)
    @Column(name = "groupe_sanguin")
    private GroupeSanguin groupeSanguin;

    private String mutuelle;

    @Column(name = "numero_police_mutuelle")
    private String numeroPoliceMutuelle;

    @Column(name = "dossier_medical_path")
    private String dossierMedicalPath;
}
