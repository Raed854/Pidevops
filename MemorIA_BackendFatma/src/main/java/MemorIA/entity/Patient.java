package MemorIA.entity;

import MemorIA.entity.role.GroupeSanguin;
import MemorIA.entity.role.Sexe;
import MemorIA.config.SexeEnumConverter;
import MemorIA.config.StringToEnumConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "date_naissance")
    private LocalDate dateNaissance;

    @Convert(converter = SexeEnumConverter.class)
    @Column(name = "sexe", nullable = true, length = 50)
    private Sexe sexe;

    @Column(name = "numero_securite_sociale", unique = true)
    private String numeroSecuriteSociale;

    private String adresse;

    private String ville;

    @Convert(converter = StringToEnumConverter.class)
    @Column(name = "groupe_sanguin", nullable = true, length = 10)
    private GroupeSanguin groupeSanguin;

    private String mutuelle;

    @Column(name = "numero_police_mutuelle")
    private String numeroPoliceMutuelle;

    @Column(name = "dossier_medical_path")
    private String dossierMedicalPath;

    private Double adherenceRate; // 0-100

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accompagnant_id")
    private Accompagnant accompagnant;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "accompagnant_assigned_at")
    private LocalDateTime accompagnantAssignedAt;

        // Explicit Getters and Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public User getUser() { return user; }
        public void setUser(User user) { this.user = user; }

        public LocalDate getDateNaissance() { return dateNaissance; }
        public void setDateNaissance(LocalDate dateNaissance) { this.dateNaissance = dateNaissance; }

        public Sexe getSexe() { return sexe; }
        public void setSexe(Sexe sexe) { this.sexe = sexe; }

        public String getNumeroSecuriteSociale() { return numeroSecuriteSociale; }
        public void setNumeroSecuriteSociale(String numeroSecuriteSociale) { this.numeroSecuriteSociale = numeroSecuriteSociale; }

        public String getAdresse() { return adresse; }
        public void setAdresse(String adresse) { this.adresse = adresse; }

        public String getVille() { return ville; }
        public void setVille(String ville) { this.ville = ville; }

        public GroupeSanguin getGroupeSanguin() { return groupeSanguin; }
        public void setGroupeSanguin(GroupeSanguin groupeSanguin) { this.groupeSanguin = groupeSanguin; }

        public String getMutuelle() { return mutuelle; }
        public void setMutuelle(String mutuelle) { this.mutuelle = mutuelle; }

        public String getNumeroPoliceMutuelle() { return numeroPoliceMutuelle; }
        public void setNumeroPoliceMutuelle(String numeroPoliceMutuelle) { this.numeroPoliceMutuelle = numeroPoliceMutuelle; }

        public String getDossierMedicalPath() { return dossierMedicalPath; }
        public void setDossierMedicalPath(String dossierMedicalPath) { this.dossierMedicalPath = dossierMedicalPath; }

        public Double getAdherenceRate() { return adherenceRate; }
        public void setAdherenceRate(Double adherenceRate) { this.adherenceRate = adherenceRate; }

        public Accompagnant getAccompagnant() { return accompagnant; }
        public void setAccompagnant(Accompagnant accompagnant) { this.accompagnant = accompagnant; }

        public LocalDateTime getAccompagnantAssignedAt() { return accompagnantAssignedAt; }
        public void setAccompagnantAssignedAt(LocalDateTime accompagnantAssignedAt) { this.accompagnantAssignedAt = accompagnantAssignedAt; }
}