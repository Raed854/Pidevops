package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    private String role;
    private Boolean actif;
    private String adresse;
    private LocalDate dateNaissance;
    private String sexe;
    private String specialite;
    private String matricule;
    private String relation;
    private Long patientId;
    private Long soignantId;
    private Boolean profileCompleted;

    public String getDisplayName() {
        return this.prenom + " " + this.nom;
    }
}
