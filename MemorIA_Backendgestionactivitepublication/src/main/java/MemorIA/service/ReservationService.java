package MemorIA.service;

import MemorIA.entity.*;
import MemorIA.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Service
@RequiredArgsConstructor
@Transactional
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final SeanceService seanceService;
    private final AbonnementService abonnementService;
    private final SimpMessagingTemplate messagingTemplate;

    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    private void notifyUpdate(String message) {
        messagingTemplate.convertAndSend("/topic/reservations", message);
    }

    public List<Reservation> getReservationsByAccompagnant(Long accompagnantId) {
        return reservationRepository.findByAccompagnantId(accompagnantId);
    }

    public List<Reservation> getReservationsBySoignant(Long soignantId) {
        return reservationRepository.findBySeanceActiviteSoignantId(soignantId);
    }

    public Reservation reserver(Long seanceId, User accompagnant) {
        Seance seance = seanceService.getSeanceById(seanceId);
        if (seance == null) {
            throw new RuntimeException("Séance inexistante.");
        }

        if (seance.getStatut() != StatutSeance.DISPONIBLE) {
            throw new RuntimeException(
                    "Cette séance n'est pas disponible (Statut actuel: " + seance.getStatut() + ").");
        }

        // Vérification de l'abonnement
        Abonnement activeAbo = abonnementService.getActiveAbonnement(accompagnant.getId());

        System.out.println("[Reservation] Tentative pour accompagnant ID: " + accompagnant.getId());
        if (activeAbo == null) {
            System.err.println("[Reservation] ERREUR: Aucun pack actif trouvé en base.");
            throw new RuntimeException(
                    "Aucun pack actif trouvé ou pack expiré. Veuillez acheter un nouveau pack pour réserver.");
        }

        System.out.println("[Reservation] Pack trouvé en base: ID=" + activeAbo.getId() + ", Séances="
                + activeAbo.getSeancesRestantes());

        if (activeAbo.getSeancesRestantes() <= 0) {
            System.err
                    .println("[Reservation] ERREUR: Plus de séances disponibles dans le pack ID " + activeAbo.getId());
            throw new RuntimeException("Votre pack actuel n'a plus de séances disponibles.");
        }

        // Vérification de double réservation ou autre statuts
        reservationRepository.findBySeanceIdAndStatut(seanceId, StatutReservation.ACCEPTEE).ifPresent(r -> {
            throw new RuntimeException("Cette séance est déjà réservée.");
        });

        Reservation r = new Reservation();
        r.setSeance(seance);
        r.setAccompagnant(accompagnant);
        r.setStatut(StatutReservation.ACCEPTEE); // Réservation directe sans validation médecin
        r.setDateReservation(LocalDateTime.now());

        seanceService.updateStatut(seance.getId(), StatutSeance.RESERVE);

        abonnementService.gererUtilisationSeance(accompagnant.getId());

        Reservation saved = reservationRepository.save(r);
        notifyUpdate("NOUVELLE_RESERVATION");
        return saved;
    }

    public Reservation accepter(Long reservationId) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée."));
        r.setStatut(StatutReservation.ACCEPTEE);

        Reservation saved = reservationRepository.save(r);
        notifyUpdate("RESERVATION_ACCEPTEE");
        return saved;
    }

    public Reservation annulerOuRefuser(Long reservationId, boolean isRefus) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée."));
        r.setStatut(isRefus ? StatutReservation.REFUSEE : StatutReservation.ANNULEE);

        // Relâcher la séance
        seanceService.updateStatut(r.getSeance().getId(), StatutSeance.DISPONIBLE);

        // Recréditer l'abonnement de l'utilisateur (on prend le plus récent, même si
        // TERMINE)
        List<Abonnement> abos = abonnementService.getAbonnementsByAccompagnant(r.getAccompagnant().getId());
        if (!abos.isEmpty()) {
            Abonnement abo = abos.get(0); // Le plus récent
            abo.setSeancesRestantes(abo.getSeancesRestantes() + 1);
            if (abo.getSeancesRestantes() > 0) {
                abo.setStatut(StatutAbonnement.ACTIF);
            }
            abonnementService.saveAbonnement(abo);
        }
        Reservation saved = reservationRepository.save(r);
        notifyUpdate(isRefus ? "RESERVATION_REFUSEE" : "RESERVATION_ANNULEE");
        return saved;
    }

    public Reservation marquerPresence(Long reservationId, boolean isPresent) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée."));
        r.setStatut(isPresent ? StatutReservation.TERMINEE_PRESENTE : StatutReservation.TERMINEE_ABSENTE);
        return reservationRepository.save(r);
    }
}
