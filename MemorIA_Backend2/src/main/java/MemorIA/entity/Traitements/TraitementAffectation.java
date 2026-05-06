package MemorIA.entity.Traitements;

import MemorIA.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Entity
@Table(name = "traitement_affectation")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TraitementAffectation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAffectation;

    @ManyToOne
    @JoinColumn(name = "id_traitement", nullable = false)
    private Traitements traitements;

    @ManyToOne
    @JoinColumn(name = "id_patient", nullable = false)
    @JsonIgnore
    private User patientUser;

    @ManyToOne
    @JoinColumn(name = "id_accompagnant")
    @JsonIgnore
    private User accompagnantUser;

    @Column(name = "date_affectation", nullable = false)
    private LocalDateTime dateAffectation;

    @Column(name = "date_fin_prevue")
    private LocalDateTime dateFinPrevue;

    @Column(name = "statut", nullable = false)
    @Enumerated(EnumType.STRING)
    private StatutAffectation statut;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    @PrePersist
    protected void onCreate() {
        dateCreation = LocalDateTime.now();
        dateModification = LocalDateTime.now();
        if (statut == null) {
            statut = StatutAffectation.EN_COURS;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        dateModification = LocalDateTime.now();
    }
}
