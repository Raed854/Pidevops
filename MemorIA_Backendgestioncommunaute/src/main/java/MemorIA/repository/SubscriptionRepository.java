package MemorIA.repository;

import MemorIA.entity.community.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findByUserId(Long userId);
    Optional<Subscription> findByStripeSubscriptionId(String stripeSubscriptionId);
}
