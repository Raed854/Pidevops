package MemorIA.service;

import MemorIA.dto.DashboardStatsDTO;
import MemorIA.entity.Reservation;
import MemorIA.entity.StatutSeance;
import MemorIA.repository.AbonnementRepository;
import MemorIA.repository.ActiviteRepository;
import MemorIA.repository.ReservationRepository;
import MemorIA.repository.SeanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

        private final ActiviteRepository activiteRepository;
        private final SeanceRepository seanceRepository;
        private final ReservationRepository reservationRepository;
        private final AbonnementRepository abonnementRepository;

        public DashboardStatsDTO getSoignantStats(Long soignantId) {
                long totalActivities = activiteRepository.findBySoignantId(soignantId).size();

                // Stats sur les séances du soignant
                var seances = seanceRepository.findAll().stream()
                                .filter(s -> s.getActivite() != null && s.getActivite().getSoignant() != null
                                                && s.getActivite().getSoignant().getId().equals(soignantId))
                                .collect(Collectors.toList());

                long totalSessions = seances.size();
                long available = seances.stream().filter(s -> s.getStatut() == StatutSeance.DISPONIBLE).count();
                long reserved = seances.stream().filter(s -> s.getStatut() == StatutSeance.RESERVE).count();
                long cancelled = seances.stream().filter(s -> s.getStatut() == StatutSeance.ANNULE).count();

                // Réservations liées aux activités du soignant
                List<Reservation> reservations = reservationRepository.findBySeanceActiviteSoignantId(soignantId);
                long totalReservations = reservations.size();

                Map<String, Long> reservationsPerActivity = reservations.stream()
                                .collect(Collectors.groupingBy(r -> r.getSeance().getActivite().getTitre(),
                                                Collectors.counting()));

                // Liste des abonnés (vue globale pour le docteur) triée par date
                List<DashboardStatsDTO.SubscriberStats> subscriberStats = abonnementRepository
                                .findAllByOrderByDateDebutDesc().stream()
                                .map(abo -> DashboardStatsDTO.SubscriberStats.builder()
                                                .fullUserName(abo.getAccompagnant() != null
                                                                ? (abo.getAccompagnant().getNom() + " "
                                                                                + abo.getAccompagnant().getPrenom())
                                                                : "Utilisateur Inconnu")
                                                .typePack(abo.getType().name())
                                                .statut(abo.getStatut().name())
                                                .seancesTotal(abo.getType().getNombreSeances())
                                                .seancesUsed(abo.getType().getNombreSeances()
                                                                - abo.getSeancesRestantes())
                                                .seancesRestantes(abo.getSeancesRestantes())
                                                .dateFin(abo.getDateFin()
                                                                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                                                .build())
                                .collect(Collectors.toList());

                return DashboardStatsDTO.builder()
                                .totalActivities(totalActivities)
                                .totalSessions(totalSessions)
                                .availableSessions(available)
                                .reservedSessions(reserved)
                                .cancelledSessions(cancelled)
                                .totalReservations(totalReservations)
                                .reservationsPerActivity(reservationsPerActivity)
                                .subscribers(subscriberStats)
                                .build();
        }
}
