package MemorIA.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "activites")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Activite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String image;

    private String type;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "doctor_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"activites", "diagnostics", "password"})
    private User soignant;

    @OneToMany(mappedBy = "activite", fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("activite")
    private java.util.List<Seance> seances = new java.util.ArrayList<>();
}
