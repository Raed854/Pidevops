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

        // Explicit Getters and Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public User getUser() { return user; }
        public void setUser(User user) { this.user = user; }

        public AccessLevel getNiveauAcces() { return niveauAcces; }
        public void setNiveauAcces(AccessLevel niveauAcces) { this.niveauAcces = niveauAcces; }

        public String getDepartement() { return departement; }
        public void setDepartement(String departement) { this.departement = departement; }

        public String getDroitsSpeciaux() { return droitsSpeciaux; }
        public void setDroitsSpeciaux(String droitsSpeciaux) { this.droitsSpeciaux = droitsSpeciaux; }

        public String getResponsableAu() { return responsableAu; }
        public void setResponsableAu(String responsableAu) { this.responsableAu = responsableAu; }

        public LocalDate getDateDebutMandat() { return dateDebutMandat; }
        public void setDateDebutMandat(LocalDate dateDebutMandat) { this.dateDebutMandat = dateDebutMandat; }

        public LocalDate getDateFinMandat() { return dateFinMandat; }
        public void setDateFinMandat(LocalDate dateFinMandat) { this.dateFinMandat = dateFinMandat; }
}
