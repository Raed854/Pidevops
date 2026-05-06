package MemorIA.entity;

import MemorIA.entity.role.FrequenceAccompagnement;
import MemorIA.entity.role.LienPatient;
import MemorIA.entity.role.SituationPro;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

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
    @Column(name = "lien_patient")
    private LienPatient lienPatient;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "date_naissance")
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
    @Column(name = "frequence_accompagnement")
    private FrequenceAccompagnement frequenceAccompagnement;

    @OneToMany(mappedBy = "accompagnant", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Patient> patients = new ArrayList<>();

        // Explicit Getters and Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public User getUser() { return user; }
        public void setUser(User user) { this.user = user; }

        public LienPatient getLienPatient() { return lienPatient; }
        public void setLienPatient(LienPatient lienPatient) { this.lienPatient = lienPatient; }

        public LocalDate getDateNaissance() { return dateNaissance; }
        public void setDateNaissance(LocalDate dateNaissance) { this.dateNaissance = dateNaissance; }

        public String getAdresse() { return adresse; }
        public void setAdresse(String adresse) { this.adresse = adresse; }

        public String getCodePostal() { return codePostal; }
        public void setCodePostal(String codePostal) { this.codePostal = codePostal; }

        public String getVille() { return ville; }
        public void setVille(String ville) { this.ville = ville; }

        public String getTelephoneSecours() { return telephoneSecours; }
        public void setTelephoneSecours(String telephoneSecours) { this.telephoneSecours = telephoneSecours; }

        public SituationPro getSituationPro() { return situationPro; }
        public void setSituationPro(SituationPro situationPro) { this.situationPro = situationPro; }

        public FrequenceAccompagnement getFrequenceAccompagnement() { return frequenceAccompagnement; }
        public void setFrequenceAccompagnement(FrequenceAccompagnement frequenceAccompagnement) { this.frequenceAccompagnement = frequenceAccompagnement; }

        public List<Patient> getPatients() { return patients; }
        public void setPatients(List<Patient> patients) { this.patients = patients; }
}
