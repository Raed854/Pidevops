package MemorIA.entity.diagnostic;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "rapport")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"diagnostic", "notifications"})
@EqualsAndHashCode(exclude = {"diagnostic", "notifications"})
public class Rapport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idRapport;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String resumer;

    @Column(name = "analyse_detaillee", columnDefinition = "TEXT")
    private String analyseDetaillee;

    @Column(name = "valide_par_medecin")
    private Boolean valideParMedecin;

    @Column(name = "date_generation")
    private LocalDateTime dateGeneration;

    @OneToOne
    @JoinColumn(name = "diagnostic_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"rapport", "patientAnswers", "notifications"})
    private Diagnostic diagnostic;

    @OneToMany(mappedBy = "rapport", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonIgnoreProperties({"rapport", "diagnostic"})
    private List<Notification> notifications;
}
