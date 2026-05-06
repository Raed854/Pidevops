package MemorIA.repository;

import MemorIA.entity.Reservation;
import MemorIA.entity.StatutReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByAccompagnantId(Long accompagnantId);
    List<Reservation> findBySeanceId(Long seanceId);
    
    // Pour empêcher la double réservation par le même accompagnant ou un autre si ce n'est pas permis
    Optional<Reservation> findBySeanceIdAndStatut(Long seanceId, StatutReservation statut);
    
    // Trouver les réservations pour un soignant (via les séances de ses activités)
    List<Reservation> findBySeanceActiviteSoignantId(Long soignantId);
}
