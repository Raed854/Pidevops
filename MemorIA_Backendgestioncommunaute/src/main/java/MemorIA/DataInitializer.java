package MemorIA;

import MemorIA.entity.User;
import MemorIA.entity.Role;
import MemorIA.entity.community.SubscriptionPlan;
import MemorIA.repository.UserRepository;
import MemorIA.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SubscriptionPlanRepository planRepository;

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail("doctor@example.com").isEmpty()) {
            userRepository.save(User.builder()
                    .firstName("Dr.")
                    .lastName("Jean")
                    .email("doctor@example.com")
                    .password("$2b$12$XScegLjpGathXPphzV9gVOK6Ks5TXzYtrULqKLEDkWmHIZxgy8rXq")
                    .role(Role.SOIGNANT)
                    .enabled(true)
                    .telephone("000000000")
                    .profileCompleted(true)
                    .build());
            System.out.println("Data initialized: doctor@example.com / password");
        }

        if (userRepository.findByEmail("care@example.com").isEmpty()) {
            userRepository.save(User.builder()
                    .firstName("Marie")
                    .lastName("Curie")
                    .email("care@example.com")
                    .password("$2b$12$XScegLjpGathXPphzV9gVOK6Ks5TXzYtrULqKLEDkWmHIZxgy8rXq")
                    .role(Role.ACCOMPAGNANT)
                    .enabled(true)
                    .telephone("111111111")
                    .profileCompleted(true)
                    .build());
            System.out.println("Data initialized: care@example.com / password");
        }

        // Seed subscription plans
        if (planRepository.findByPlanType("WEEKLY").isEmpty()) {
            planRepository.save(SubscriptionPlan.builder()
                    .name("Hebdomadaire")
                    .planType("WEEKLY")
                    .price(4.99)
                    .build());
        }
        if (planRepository.findByPlanType("MONTHLY").isEmpty()) {
            planRepository.save(SubscriptionPlan.builder()
                    .name("Mensuel")
                    .planType("MONTHLY")
                    .price(9.99)
                    .build());
        }
        if (planRepository.findByPlanType("YEARLY").isEmpty()) {
            planRepository.save(SubscriptionPlan.builder()
                    .name("Annuel")
                    .planType("YEARLY")
                    .price(79.99)
                    .build());
        }
        System.out.println("Subscription plans initialized.");
    }
}
