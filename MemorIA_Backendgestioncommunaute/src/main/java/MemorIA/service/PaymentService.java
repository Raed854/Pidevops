package MemorIA.service;

import MemorIA.entity.User;
import MemorIA.entity.community.Subscription;
import MemorIA.entity.community.SubscriptionPlan;
import MemorIA.repository.SubscriptionPlanRepository;
import MemorIA.repository.SubscriptionRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Invoice;
import com.stripe.model.InvoiceItem;
import com.stripe.model.PaymentMethod;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final SubscriptionRepository subscriptionRepo;
    private final SubscriptionPlanRepository planRepo;
    private final EmailService emailService;

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    /**
     * Process a card payment via Stripe Invoice API.
     * Uses Invoice instead of direct PaymentIntent to get a proper invoice_pdf URL.
     * Flow: Customer → PaymentMethod → InvoiceItem → Invoice → Finalize → Pay → PDF
     */
    public Map<String, Object> processPayment(User user, String planType,
                                                String cardNumber, int expMonth, int expYear, String cvc) throws StripeException {
        SubscriptionPlan plan = planRepo.findByPlanType(planType)
                .orElseThrow(() -> new RuntimeException("Plan not found: " + planType));

        String token = mapCardToToken(cardNumber);

        // 1. Create a Stripe Customer
        Map<String, Object> custParams = new HashMap<>();
        custParams.put("name", user.getName());
        custParams.put("email", user.getEmail());
        Customer customer = Customer.create(custParams);

        // 2. Create PaymentMethod and attach to Customer
        Map<String, Object> pmParams = new HashMap<>();
        pmParams.put("type", "card");
        pmParams.put("card", Map.of("token", token));
        PaymentMethod paymentMethod = PaymentMethod.create(pmParams);

        paymentMethod.attach(Map.of("customer", customer.getId()));

        // Set as default payment method
        customer.update(Map.of(
            "invoice_settings", Map.of("default_payment_method", paymentMethod.getId())
        ));

        // 3. Create InvoiceItem
        long amountInCents = Math.round(plan.getPrice() * 100);
        Map<String, Object> itemParams = new HashMap<>();
        itemParams.put("customer", customer.getId());
        itemParams.put("amount", amountInCents);
        itemParams.put("currency", "eur");
        itemParams.put("description", "MemorIA - Abonnement " + plan.getName());
        InvoiceItem.create(itemParams);

        // 4. Create Invoice
        Map<String, Object> invParams = new HashMap<>();
        invParams.put("customer", customer.getId());
        invParams.put("auto_advance", false);
        Invoice invoice = Invoice.create(invParams);

        // 5. Finalize the Invoice (this generates the invoice_pdf URL)
        invoice = invoice.finalizeInvoice();

        // 6. Pay the Invoice (only if not auto-collected)
        if (!"paid".equals(invoice.getStatus())) {
            invoice = invoice.pay();
        }

        // 7. Check if payment succeeded
        Map<String, Object> result = new HashMap<>();
        if ("paid".equals(invoice.getStatus())) {
            // 7a. Download invoice PDF and save locally
            String receiptFileName = null;
            java.io.File receiptFile = null;
            try {
                String pdfUrl = invoice.getInvoicePdf();
                if (pdfUrl != null && !pdfUrl.isEmpty()) {
                    java.net.URL url = java.net.URI.create(pdfUrl).toURL();
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(true);
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0");
                    conn.connect();

                    byte[] pdfBytes;
                    try (java.io.InputStream in = conn.getInputStream()) {
                        pdfBytes = in.readAllBytes();
                    }
                    conn.disconnect();

                    // Save to uploads/receipts/
                    java.nio.file.Path receiptsDir = java.nio.file.Paths.get(uploadDir, "receipts");
                    java.nio.file.Files.createDirectories(receiptsDir);
                    receiptFileName = "receipt-" + invoice.getId() + ".pdf";
                    receiptFile = receiptsDir.resolve(receiptFileName).toFile();
                    try (java.io.FileOutputStream fos = new java.io.FileOutputStream(receiptFile)) {
                        fos.write(pdfBytes);
                    }
                }
            } catch (Exception e) {
                System.err.println("Could not download invoice PDF: " + e.getMessage());
            }

            // 8. Save subscription
            LocalDateTime periodEnd = calculatePeriodEnd(planType);
            Subscription sub = subscriptionRepo.findByUserId(user.getId())
                    .orElse(new Subscription());
            sub.setUser(user);
            sub.setStripeSubscriptionId(invoice.getId());
            sub.setStripeCustomerId(customer.getId());
            sub.setStatus("ACTIVE");
            sub.setPlanType(planType);
            sub.setCurrentPeriodEnd(periodEnd);
            sub.setCreatedAt(LocalDateTime.now());
            sub.setCancelledAt(null);
            sub.setReceiptUrl(receiptFileName);
            subscriptionRepo.save(sub);

            // 9. Send email with receipt PDF attachment (best effort)
            try {
                emailService.sendSubscriptionConfirmation(
                        user.getEmail(), user.getName(), planType,
                        receiptFile != null ? receiptFile.getAbsolutePath() : null);
            } catch (Exception e) {
                System.err.println("Email sending failed: " + e.getMessage());
            }

            result.put("success", true);
            result.put("message", "Paiement réussi !");
            result.put("paymentId", invoice.getId());
        } else {
            result.put("success", false);
            result.put("message", "Le paiement a échoué. Statut: " + invoice.getStatus());
        }

        return result;
    }

    private LocalDateTime calculatePeriodEnd(String planType) {
        return switch (planType) {
            case "WEEKLY" -> LocalDateTime.now().plusWeeks(1);
            case "MONTHLY" -> LocalDateTime.now().plusMonths(1);
            case "YEARLY" -> LocalDateTime.now().plusYears(1);
            default -> LocalDateTime.now().plusMonths(1);
        };
    }

    /**
     * Maps test card numbers to Stripe test tokens.
     * See: https://stripe.com/docs/testing#cards
     */
    private String mapCardToToken(String cardNumber) {
        String cleaned = cardNumber.replace(" ", "").replace("-", "");
        return switch (cleaned) {
            case "4242424242424242" -> "tok_visa";
            case "4000056655665556" -> "tok_visa_debit";
            case "5555555555554444" -> "tok_mastercard";
            case "5200828282828210" -> "tok_mastercard_debit";
            case "378282246310005"  -> "tok_amex";
            case "4000000000009995" -> "tok_chargeDeclined";
            case "4000000000000002" -> "tok_chargeDeclined";
            default -> "tok_visa"; // Default to Visa for any test input
        };
    }

    public Map<String, Object> getSubscriptionStatus(Long userId) {
        Map<String, Object> result = new HashMap<>();
        Optional<Subscription> sub = subscriptionRepo.findByUserId(userId);
        if (sub.isPresent() && "ACTIVE".equals(sub.get().getStatus())) {
            result.put("active", true);
            result.put("planType", sub.get().getPlanType());
            result.put("currentPeriodEnd", sub.get().getCurrentPeriodEnd());
            result.put("receiptUrl", sub.get().getReceiptUrl());
        } else {
            result.put("active", false);
        }
        return result;
    }

    public void cancelSubscription(Long userId) {
        Subscription sub = subscriptionRepo.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("No subscription found"));
        sub.setStatus("CANCELLED");
        sub.setCancelledAt(LocalDateTime.now());
        subscriptionRepo.save(sub);
    }

    public List<Subscription> getAllSubscriptions() {
        return subscriptionRepo.findAll();
    }

    public void deleteSubscription(Long subscriptionId) {
        Subscription sub = subscriptionRepo.findById(subscriptionId)
                .orElseThrow(() -> new RuntimeException("Subscription not found"));
        subscriptionRepo.delete(sub);
    }

    public List<SubscriptionPlan> getPlans() {
        return planRepo.findAll();
    }
}
