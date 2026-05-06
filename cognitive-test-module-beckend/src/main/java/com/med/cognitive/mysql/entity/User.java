package com.med.cognitive.mysql.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * User entity mapped to the shared MySQL table Memoria_db.users
 * owned by MemorIA_backend.
 *
 * Persisted columns mirror MemorIA_backend's User schema exactly:
 *   id, password, nom, prenom, telephone, role, actif, profile_completed, email
 *
 * The remaining fields (adresse, dateNaissance, sexe, specialite, matricule,
 * relation, patient, soignant) are @Transient. They exist so the cognitive
 * module's existing code (DTO mappers, filters) keeps compiling; they simply
 * return null at runtime. If those attributes are ever needed here, fetch them
 * from their owning microservice instead of altering the shared users table.
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false)
    private String password;

    @NotBlank
    @Column(nullable = false)
    private String nom;

    @NotBlank
    @Column(nullable = false)
    private String prenom;

    @NotBlank
    @Column(nullable = false)
    private String telephone;

    @NotBlank
    @Column(nullable = false)
    private String role; // PATIENT, SOIGNANT, AIDANT

    @NotNull
    @Column(nullable = false)
    private Boolean actif;

    @Email
    @NotBlank
    @Column(nullable = false, unique = true)
    private String email;

    @NotNull
    @Column(name = "profile_completed", nullable = false)
    private Boolean profileCompleted = false;

    // ---------------------------------------------------------------
    // Fields NOT present in the shared Memoria_db.users schema.
    // Marked @Transient so they are never persisted and never trigger
    // DDL changes against the shared table.
    // ---------------------------------------------------------------
    @Transient
    private String adresse;

    @Transient
    private LocalDate dateNaissance;

    @Transient
    private String sexe;

    @Transient
    private String specialite;

    @Transient
    private String matricule;

    @Transient
    private String relation;

    @Transient
    private User patient;

    @Transient
    private User soignant;

    // Helper method to get display name
    public String getDisplayName() {
        return this.prenom + " " + this.nom;
    }

    // Constructor for backwards compatibility
    public User(String nom, String prenom, String email, String telephone, String role,
                Boolean actif, LocalDate dateNaissance, String sexe, String adresse) {
        this.nom = nom;
        this.prenom = prenom;
        this.email = email;
        this.telephone = telephone;
        this.role = role;
        this.actif = actif;
        this.dateNaissance = dateNaissance;
        this.sexe = sexe;
        this.adresse = adresse;
        this.profileCompleted = false;
    }
}
