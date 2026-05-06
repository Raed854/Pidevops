package MemorIA.entity.Traitements;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

@Entity
@Table(name = "alert_patient")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlertPatient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAlerte;

    @Column(nullable = false)
    private LocalDateTime dateAlerte;

    @Column(nullable = false)
    private String alert;

    @Column(nullable = false)
    private Boolean lu = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_traitement", nullable = false)
    @JsonIgnore
    private Traitements traitements;

    @JsonProperty("idTraitement")
    public Long getIdTraitement() {
        return traitements != null ? traitements.getIdTraitement() : null;
    }

    @PrePersist
    protected void onCreate() {
        if (dateAlerte == null) {
            dateAlerte = LocalDateTime.now();
        }
        if (lu == null) {
            lu = false;
        }
    }
}
