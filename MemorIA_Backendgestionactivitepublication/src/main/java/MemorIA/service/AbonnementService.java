package MemorIA.service;

import MemorIA.entity.Abonnement;
import MemorIA.entity.StatutAbonnement;
import MemorIA.entity.TypeAbonnement;
import MemorIA.entity.User;
import MemorIA.repository.AbonnementRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@org.springframework.transaction.annotation.Transactional
public class AbonnementService {

    private final AbonnementRepository abonnementRepository;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Value("${stripe.secret.key:sk_test_123}")
    private String stripeSecretKey;

    public Abonnement getActiveAbonnement(Long accompagnantId) {
        if (accompagnantId == null || accompagnantId == 0)
            return null;

        System.out.println("[AbonnementService] getActiveAbonnement pour userId: " + accompagnantId);
        java.util.List<Abonnement> all = abonnementRepository.findByAccompagnantIdOrderByDateDebutDesc(accompagnantId);
        System.out.println("[AbonnementService] Nombre total d'abonnements trouvés: " + all.size());

        if (all.isEmpty())
            return null;

        LocalDateTime now = LocalDateTime.now();

        // On cherche le pack le plus récent qui est explicitement ACTIF, non expiré et
        // avec des séances restantes
        Abonnement active = all.stream()
                .filter(a -> StatutAbonnement.ACTIF.equals(a.getStatut()))
                .filter(a -> {
                    boolean ok = a.getDateFin() == null || a.getDateFin().isAfter(now);
                    if (!ok)
                        System.out.println("[AbonnementService] Pack ID " + a.getId() + " ignoré car expiré (Fin: "
                                + a.getDateFin() + ")");
                    return ok;
                })
                .filter(a -> {
                    boolean ok = a.getSeancesRestantes() > 0;
                    if (!ok)
                        System.out.println(
                                "[AbonnementService] Pack ID " + a.getId() + " ignoré car 0 séances restantes");
                    return ok;
                })
                .findFirst()
                .orElse(null);

        if (active != null) {
            System.out.println("[AbonnementService] Pack ACTIF trouvé: ID=" + active.getId() + ", Séances="
                    + active.getSeancesRestantes());
        } else {
            System.out
                    .println("[AbonnementService] AUCUN pack actif/valide trouvé pour l'utilisateur " + accompagnantId);
        }

        return active;
    }

    public java.util.List<Abonnement> getAllAbonnements() {
        return abonnementRepository.findAllByOrderByDateDebutDesc();
    }

    public java.util.List<Abonnement> getAbonnementsByAccompagnant(Long accompagnantId) {
        return abonnementRepository.findByAccompagnantIdOrderByDateDebutDesc(accompagnantId);
    }

    public Abonnement saveAbonnement(Abonnement abo) {
        return abonnementRepository.save(abo);
    }

    public String createPaymentIntent(TypeAbonnement type, Long accompagnantId) throws StripeException {
        // Strict Check: Un seul abonnement actif avec sessions autorisées
        Abonnement current = getActiveAbonnement(accompagnantId);
        if (current != null && current.getSeancesRestantes() > 0) {
            throw new RuntimeException("Vous avez déjà un pack actif avec " + current.getSeancesRestantes()
                    + " séances. Terminez-le avant d'en racheter un.");
        }

        // Mode Simulation si la clé est par défaut
        if ("sk_test_123".equals(stripeSecretKey)) {
            return "simulated_client_secret_" + System.currentTimeMillis();
        }

        Stripe.apiKey = stripeSecretKey;

        long amount = 0;
        switch (type) {
            case PACK_4:
                amount = 4000;
                break;
            case PACK_15:
                amount = 13500;
                break;
            case PACK_50:
                amount = 40000;
                break;
        }

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amount)
                .setCurrency("eur")
                .putMetadata("type", type.name())
                .putMetadata("accompagnantId", String.valueOf(accompagnantId))
                .build();

        PaymentIntent intent = PaymentIntent.create(params);
        return intent.getClientSecret();
    }

    public Abonnement createAbonnementAfterPayment(User accompagnant, TypeAbonnement type, String paymentIntentId,
            String cardNumber, String expMonth, String expYear, Double amount) {
        // IMPORTANT : Désactiver les anciens abonnements ACTIFS pour ne pas avoir de
        // conflits
        java.util.List<Abonnement> oldAbos = abonnementRepository.findByAccompagnantIdAndStatut(accompagnant.getId(),
                StatutAbonnement.ACTIF);
        for (Abonnement old : oldAbos) {
            old.setStatut(StatutAbonnement.TERMINE);
            abonnementRepository.save(old);
        }

        Abonnement abonnement = new Abonnement();
        abonnement.setAccompagnant(accompagnant);
        abonnement.setType(type);
        abonnement.setSeancesRestantes(type.getNombreSeances());
        abonnement.setStatut(StatutAbonnement.ACTIF);
        abonnement.setDateDebut(LocalDateTime.now());
        abonnement.setDateFin(LocalDateTime.now().plusMonths(type.getDureeMois()));
        abonnement.setStripePaymentIntentId(paymentIntentId);

        // Stockage des infos de paiement (Masquage partiel du numéro de carte)
        if (cardNumber != null && cardNumber.length() >= 4) {
            String masked = "**** **** **** " + cardNumber.substring(cardNumber.length() - 4);
            abonnement.setCardNumber(masked);
        }
        abonnement.setExpMonth(expMonth);
        abonnement.setExpYear(expYear);
        abonnement.setMontantPaye(amount);

        Abonnement saved = abonnementRepository.saveAndFlush(abonnement);

        System.out.println("[Abonnement] Pack activé pour l'utilisateur ID: " + accompagnant.getId());
        
        // Notification WebSocket APRÈS commit
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
            new org.springframework.transaction.support.TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    messagingTemplate.convertAndSend("/topic/activites", "PACK_ACTIVATE");
                }
            }
        );

        return saved;
    }

    public void gererUtilisationSeance(Long accompagnantId) {
        System.out.println("[AbonnementService] Décrémentation séance pour userId: " + accompagnantId);
        Abonnement abo = getActiveAbonnement(accompagnantId);
        if (abo == null) {
            System.err.println("[AbonnementService] ERREUR: Décrémentation impossible, aucun pack actif.");
            throw new RuntimeException("Aucun abonnement actif trouvé.");
        }

        int before = abo.getSeancesRestantes();
        abo.setSeancesRestantes(before - 1);
        System.out.println(
                "[AbonnementService] Pack ID " + abo.getId() + ": " + before + " -> " + abo.getSeancesRestantes());

        if (abo.getSeancesRestantes() == 0) {
            System.out.println("[AbonnementService] Pack ID " + abo.getId() + " marqué comme TERMINE.");
            abo.setStatut(StatutAbonnement.TERMINE);
        }
        abonnementRepository.save(abo);
    }
}
