package com.med.cognitive.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "patients")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class Patient extends AppUser {
    private LocalDate dateNaissance;
    private String sexe;
    private String adresse;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "soignant_id")
    private Soignant soignant;
    
    // Constructor for backwards compatibility
    public Patient(LocalDate dateNaissance, String sexe, String adresse) {
        this.dateNaissance = dateNaissance;
        this.sexe = sexe;
        this.adresse = adresse;
    }
}
