package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO retourné au front pour la liste déroulante de sélection du patient
 * dans le formulaire de création de recommandation.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientOptionDto {

    private Long id;
    private String nom;
    private String prenom;
    private String dateNaissance; // format ISO yyyy-MM-dd
    private Integer age;
    /** Format: "Prénom Nom - DD/MM/YYYY (xx ans)" */
    private String displayName;
}
