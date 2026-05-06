package MemorIA.controller;

import MemorIA.entity.User;
import MemorIA.entity.community.Subscription;
import MemorIA.entity.community.SubscriptionPlan;
import MemorIA.service.PaymentService;
import com.stripe.exception.StripeException;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final EntityManager entityManager;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @PostMapping("/payments/process")
    public ResponseEntity<Map<String, Object>> processPayment(@RequestBody Map<String, Object> body) {
        try {
            Long userId = Long.parseLong(body.get("userId").toString());
            String planType = body.get("planType").toString();
            String cardNumber = body.get("cardNumber").toString();
            int expMonth = Integer.parseInt(body.get("expMonth").toString());
            int expYear = Integer.parseInt(body.get("expYear").toString());
            String cvc = body.get("cvc").toString();

            User user = entityManager.find(User.class, userId);
            if (user == null) return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Utilisateur non trouvé"));

            Map<String, Object> result = paymentService.processPayment(
                    user, planType, cardNumber, expMonth, expYear, cvc);
            return ResponseEntity.ok(result);
        } catch (StripeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Erreur Stripe: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Erreur: " + e.getMessage()));
        }
    }

    @GetMapping("/subscriptions/status")
    public Map<String, Object> getStatus(@RequestParam("userId") Long userId) {
        return paymentService.getSubscriptionStatus(userId);
    }

    @PostMapping("/subscriptions/cancel")
    public ResponseEntity<Void> cancel(@RequestParam("userId") Long userId) {
        paymentService.cancelSubscription(userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/subscriptions/all")
    public List<Subscription> getAll() {
        return paymentService.getAllSubscriptions();
    }

    @DeleteMapping("/subscriptions/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        paymentService.deleteSubscription(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/subscriptions/plans")
    public List<SubscriptionPlan> getPlans() {
        return paymentService.getPlans();
    }

    @GetMapping("/subscriptions/receipt/{filename}")
    public ResponseEntity<Resource> downloadReceipt(@PathVariable("filename") String filename) {
        File file = Paths.get(uploadDir, "receipts", filename).toFile();
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        FileSystemResource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }
}
