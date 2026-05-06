package MemorIA.controller;

import MemorIA.entity.Abonnement;
import MemorIA.entity.TypeAbonnement;
import MemorIA.entity.User;
import MemorIA.service.AbonnementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/abonnements")
@RequiredArgsConstructor
public class AbonnementController {

    private final AbonnementService abonnementService;
    private final MemorIA.repository.UserRepository userRepository;

    @GetMapping("/actif/{accompagnantId}")
    public ResponseEntity<Abonnement> getActive(@PathVariable Long accompagnantId) {
        Abonnement abo = abonnementService.getActiveAbonnement(accompagnantId);
        return abo != null ? ResponseEntity.ok(abo) : ResponseEntity.noContent().build();
    }

    @GetMapping("/mes-abonnements/{accompagnantId}")
    public ResponseEntity<java.util.List<Abonnement>> getMesAbonnements(@PathVariable Long accompagnantId) {
        return ResponseEntity.ok(abonnementService.getAbonnementsByAccompagnant(accompagnantId));
    }

    @GetMapping("/all")
    public ResponseEntity<java.util.List<Abonnement>> getAll() {
        return ResponseEntity.ok(abonnementService.getAllAbonnements());
    }

    @PostMapping("/create-payment-intent")
    public ResponseEntity<?> createPaymentIntent(@RequestBody Map<String, String> payload) {
        try {
            Long accompagnantId = Long.parseLong(payload.get("accompagnantId"));
            TypeAbonnement type = TypeAbonnement.valueOf(payload.get("type"));
            String clientSecret = abonnementService.createPaymentIntent(type, accompagnantId);
            return ResponseEntity.ok(Map.of("clientSecret", clientSecret));
        } catch (com.stripe.exception.StripeException | RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/confirm-abonnement")
    public ResponseEntity<?> confirmAbonnement(@RequestBody Map<String, String> payload) {
        try {
            Long accompagnantId = Long.parseLong(payload.get("accompagnantId"));
            TypeAbonnement type = TypeAbonnement.valueOf(payload.get("type"));
            String paymentIntentId = payload.get("paymentIntentId");
            String cardNumber = payload.get("cardNumber");
            String expMonth = payload.get("expMonth");
            String expYear = payload.get("expYear");
            Double amount = payload.containsKey("amount") ? Double.parseDouble(payload.get("amount")) : 0.0;

            User accompagnant = userRepository.findById(accompagnantId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            Abonnement abo = abonnementService.createAbonnementAfterPayment(
                    accompagnant, type, paymentIntentId, cardNumber, expMonth, expYear, amount);
            return ResponseEntity.ok(abo);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
