package MemorIA.controller;

import MemorIA.service.ReservationService;
import MemorIA.entity.Reservation;
import MemorIA.entity.StatutReservation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final ReservationService reservationService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserStats(@PathVariable Long userId) {
        List<Reservation> userReservations = reservationService.getReservationsByAccompagnant(userId);
        
        long totalReservations = userReservations.size();
        long acceptrees = userReservations.stream().filter(r -> r.getStatut() == StatutReservation.ACCEPTEE).count();
        long refusees = userReservations.stream().filter(r -> r.getStatut() == StatutReservation.REFUSEE).count();
        long terminees = userReservations.stream().filter(r -> r.getStatut() == StatutReservation.TERMINEE_PRESENTE || r.getStatut() == StatutReservation.TERMINEE_ABSENTE).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalReservations", totalReservations);
        stats.put("acceptrees", acceptrees);
        stats.put("refusees", refusees);
        stats.put("terminees", terminees);
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/activity")
    public ResponseEntity<?> getActivityChart() {
        // Renvoie des données pour un graphique (ex: réservations par jour ou par activité)
        List<Reservation> all = reservationService.getAllReservations();
        
        // Group by activity title for example
        Map<String, Long> activityCounts = all.stream()
            .collect(Collectors.groupingBy(r -> r.getSeance().getActivite().getTitre(), Collectors.counting()));

        List<Map<String, Object>> chartData = activityCounts.entrySet().stream()
            .map(entry -> {
                Map<String, Object> item = new HashMap<>();
                item.put("name", entry.getKey());
                item.put("count", entry.getValue());
                return item;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(chartData);
    }

    @GetMapping("/accompagnant/{id}")
    public ResponseEntity<?> getAccompagnantStats(@PathVariable Long id) {
        return getUserStats(id);
    }
}
