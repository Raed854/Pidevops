package MemorIA.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import MemorIA.entity.Traitements.Disponibilite;
import MemorIA.entity.Traitements.TraitementAffectation;
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

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Disponibilite> disponibilites;

    @OneToMany(mappedBy = "patientUser", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<TraitementAffectation> traitementEnTantQuePatient;

    @OneToMany(mappedBy = "accompagnantUser", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<TraitementAffectation> traitementEnTantQueAccompagnant;
}
