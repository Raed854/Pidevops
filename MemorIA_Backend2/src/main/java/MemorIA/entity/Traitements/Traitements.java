package MemorIA.entity.Traitements;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import java.util.List;


@Entity
@Table(name = "traitements")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Traitements {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idTraitement;

    @Column(nullable = false)
    private String titre;

    @Column(name = "alerte_active")
    private Boolean alerteActive;

    @Column(name = "type_alerte")
    private String typeAlerte;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;

    @OneToMany(mappedBy = "traitements", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<TraitementAffectation> affectations;

    @OneToMany(mappedBy = "traitements", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<ZoneAutorisee> zonesAutorisees;

    @OneToMany(mappedBy = "traitements", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<HistoriquePosition> historiquePositions;

    @OneToMany(mappedBy = "traitements", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<AlertPatient> alertes;

    @PrePersist
    protected void onCreate() {
        if (dateCreation == null) {
            dateCreation = LocalDateTime.now();
        }
        if (alerteActive == null) {
            alerteActive = false;
        }
    }
}
