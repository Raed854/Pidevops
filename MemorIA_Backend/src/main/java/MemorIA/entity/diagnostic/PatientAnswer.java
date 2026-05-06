package MemorIA.entity.diagnostic;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "patient_answer")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reponse_text", columnDefinition = "TEXT")
    private String reponseText;

    @Column(name = "score_obtenu")
    private Double scoreObtenu;

    @Column(name = "temps_reponse_secondes")
    private Double tempsReponseSecondes;

    @ManyToOne
    @JoinColumn(name = "diagnostic_id", nullable = false)
    @JsonIgnoreProperties({"patientAnswers", "user", "rapport", "notifications"})
    private Diagnostic diagnostic;

    @ManyToOne
    @JoinColumn(name = "question_id", nullable = false)
    @JsonIgnoreProperties({"patientAnswers", "reponses", "user"})
    private Question question;
}
