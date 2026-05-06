package com.med.cognitive.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private Long id;
    private String email;
    private String nom;
    private String prenom;
    private String role;
    private String adresse;
    private Boolean profileCompleted;
    private String message;
}
