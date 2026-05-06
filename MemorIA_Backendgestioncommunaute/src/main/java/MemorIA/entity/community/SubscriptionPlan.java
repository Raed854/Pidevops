package MemorIA.entity.community;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "subscription_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // Hebdomadaire, Mensuel, Annuel

    @Column(name = "plan_type", nullable = false, unique = true)
    private String planType; // WEEKLY, MONTHLY, YEARLY

    @Column(nullable = false)
    private double price; // e.g. 4.99, 9.99, 79.99

    @Column(name = "stripe_price_id")
    private String stripePriceId; // Stripe Price ID placeholder
}
