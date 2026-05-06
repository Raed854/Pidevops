package MemorIA.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "abonnements")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Abonnement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accompagnant_id", nullable = false)
    private User accompagnant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeAbonnement type;

    @NotNull
    @Column(nullable = false)
    private Integer seancesRestantes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutAbonnement statut = StatutAbonnement.ACTIF;

    private LocalDateTime dateDebut;
    
    private LocalDateTime dateFin;

    private String stripePaymentIntentId; // Pour le tracking Stripe
    
    // Informations de paiement (Simulation demandée par l'utilisateur)
    private String cardNumber;
    private String expMonth;
    private String expYear;
    private Double montantPaye;
}
