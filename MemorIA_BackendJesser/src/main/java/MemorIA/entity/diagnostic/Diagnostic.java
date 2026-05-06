
package MemorIA.entity.diagnostic;

import MemorIA.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "diagnostic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"rapport", "patientAnswers", "notifications"})
@EqualsAndHashCode(exclude = {"rapport", "patientAnswers", "notifications"})
public class Diagnostic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDiagnostic;

    @Column(nullable = false)
    private String titre;

    @Column(name = "date_debut")
    private LocalDateTime dateDebut;

    @Column(name = "date_fin")
    private LocalDateTime dateFin;

    @Column(name = "duree_minutes")
    private Double dureeMinutes;

    @Temporal(TemporalType.DATE)
    @Column(name = "date_diagnostic")
    private Date dateDiagnostic;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "pourcentage_alzeimer")
    private Double pourcentageAlzeimer;

    @Column(name = "ai_score")
    private Double aiScore;

    @Lob
    @Column(name = "image", columnDefinition = "LONGBLOB")
    private byte[] image;

    @Column(name = "image_name")
    private String imageName;

    @Column(name = "image_type")
    private String imageType;

    @Column(name = "etat_irm")
    private String etatIrm;

    /**
     * Transient field used by the frontend to send rapport validation status.
     * Not persisted in the diagnostic table — it maps to rapport.valide_par_medecin.
     */
    @Transient
    private Boolean valideParMedecin;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"diagnostics", "questions", "notifications", "password"})
    private User user;

    @OneToOne(mappedBy = "diagnostic", cascade = CascadeType.ALL)
    @JsonIgnoreProperties("diagnostic")
    private Rapport rapport;

    @OneToMany(mappedBy = "diagnostic", cascade = CascadeType.ALL)
    @JsonIgnoreProperties({"diagnostic", "question"})
    private List<PatientAnswer> patientAnswers;

    @OneToMany(mappedBy = "diagnostic", cascade = CascadeType.ALL)
    @JsonIgnoreProperties({"diagnostic", "user"})
    private List<Notification> notifications;
}
