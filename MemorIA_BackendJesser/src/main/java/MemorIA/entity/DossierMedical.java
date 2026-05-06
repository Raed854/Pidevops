package MemorIA.entity;

import MemorIA.entity.role.EtatComportement;
import MemorIA.entity.role.NiveauFonctionnement;
import MemorIA.entity.role.Orientation;
import MemorIA.entity.role.StadeMaladie;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "dossier_medical")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DossierMedical {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ─── Link to Patient (one dossier per patient) ───────────────────────────
    @OneToOne
    @JoinColumn(name = "patient_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"user", "dossierMedicalPath", "mutuelle", "numeroPoliceMutuelle", "groupeSanguin"})
    private Patient patient;

    // ─── 1. Basic Information ─────────────────────────────────────────────────
    @Column(name = "contact_patient")
    private String contactPatient; // phone of patient or caregiver

    // ─── 2. Diagnosis ─────────────────────────────────────────────────────────
    @Column(name = "type_diagnostic")
    private String typeDiagnostic; // e.g., "Maladie d'Alzheimer"

    @Enumerated(EnumType.STRING)
    @Column(name = "stade")
    private StadeMaladie stade; // LEGER / MODERE / SEVERE

    @Column(name = "date_diagnostic")
    private LocalDate dateDiagnostic;

    // ─── 3. Health & History ─────────────────────────────────────────────────
    @Column(name = "maladies_principales", columnDefinition = "TEXT")
    private String maladiesPrincipales; // e.g., "diabète, hypertension"

    @Column(columnDefinition = "TEXT")
    private String allergies;

    // ─── 4. Cognitive State ───────────────────────────────────────────────────
    @Column(name = "niveau_memoire")
    private String niveauMemoire; // free text describing memory level

    @Enumerated(EnumType.STRING)
    @Column(name = "orientation")
    private Orientation orientation; // CONSCIENT / CONFUS

    // ─── 5. Daily Function ────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "niveau_fonctionnement")
    private NiveauFonctionnement niveauFonctionnement; // INDEPENDANT / BESOIN_AIDE / DEPENDANT

    // ─── 6. Medications ───────────────────────────────────────────────────────
    @Column(name = "medicaments_actuels", columnDefinition = "TEXT")
    private String medicamentsActuels; // e.g., "Donepézil 10mg, Mémantine 20mg"

    // ─── 7. Behavior ──────────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "etat_comportement")
    private EtatComportement etatComportement; // CALME / ANXIEUX / AGRESSIF / FUGUE

    // ─── 8. Caregiver ─────────────────────────────────────────────────────────
    @Column(name = "accompagnant_nom")
    private String accompagnantNom;

    @Column(name = "accompagnant_contact")
    private String accompagnantContact;

    // ─── 9. Notes & Follow-up ─────────────────────────────────────────────────
    @Column(name = "notes_medecin", columnDefinition = "TEXT")
    private String notesMedecin;

    @Column(name = "derniere_visite")
    private LocalDate derniereVisite;

    // ─── Audit ────────────────────────────────────────────────────────────────
    @Column(name = "date_creation", updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    @PrePersist
    protected void onCreate() {
        dateCreation = LocalDateTime.now();
        dateModification = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        dateModification = LocalDateTime.now();
    }
}
