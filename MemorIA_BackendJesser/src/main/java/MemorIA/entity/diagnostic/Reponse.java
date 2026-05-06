package MemorIA.entity.diagnostic;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "reponse")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Reponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idReponse;

    @Column(nullable = false)
    private Boolean reponse;

    @Column(name = "reponse_text", columnDefinition = "TEXT")
    private String reponseText;

    @Column(name = "temps_reponse")
    private Double tempsReponse;

    @Column(name = "date_reponse")
    private LocalDateTime dateReponse;

    @ManyToOne
    @JoinColumn(name = "id_question", nullable = false)
    @JsonIgnoreProperties({"reponses", "patientAnswers", "user"})
    private Question question;
}
