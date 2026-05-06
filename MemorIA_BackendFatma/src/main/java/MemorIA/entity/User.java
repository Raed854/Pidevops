package MemorIA.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
    private String role;

    @NotNull
    @Column(nullable = false)
    private Boolean actif;

    @NotNull
    @Column(name = "profile_completed", nullable = false)
    private Boolean profileCompleted;

    @Email
    @NotBlank
    @Column(nullable = false, unique = true)
    private String email;

    @Transient
    private List<Object> diagnostics;

        // Explicit Getters and Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }

        public String getNom() { return nom; }
        public void setNom(String nom) { this.nom = nom; }

        public String getPrenom() { return prenom; }
        public void setPrenom(String prenom) { this.prenom = prenom; }

        public String getTelephone() { return telephone; }
        public void setTelephone(String telephone) { this.telephone = telephone; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public Boolean getActif() { return actif; }
        public void setActif(Boolean actif) { this.actif = actif; }

        public Boolean getProfileCompleted() { return profileCompleted; }
        public void setProfileCompleted(Boolean profileCompleted) { this.profileCompleted = profileCompleted; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public List<Object> getDiagnostics() { return diagnostics; }
        public void setDiagnostics(List<Object> diagnostics) { this.diagnostics = diagnostics; }
}
