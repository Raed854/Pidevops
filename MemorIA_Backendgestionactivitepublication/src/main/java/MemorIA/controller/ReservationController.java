package MemorIA.controller;

import MemorIA.entity.Reservation;
import MemorIA.entity.User;
import MemorIA.repository.UserRepository;
import MemorIA.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @GetMapping("/accompagnant/{accompagnantId}")
    public ResponseEntity<List<Reservation>> getByAccompagnant(@PathVariable Long accompagnantId) {
        return ResponseEntity.ok(reservationService.getReservationsByAccompagnant(accompagnantId));
    }

    @GetMapping("/soignant/{soignantId}")
    public ResponseEntity<List<Reservation>> getBySoignant(@PathVariable Long soignantId) {
        return ResponseEntity.ok(reservationService.getReservationsBySoignant(soignantId));
    }

    @PostMapping("/reserver/{seanceId}/accompagnant/{accompagnantId}")
    public ResponseEntity<?> reserver(@PathVariable Long seanceId, @PathVariable Long accompagnantId) {
        try {
            // CRITICAL FIX: Load the full User from DB — a partial object causes subscription lookup to fail
            User accompagnant = userRepository.findById(accompagnantId)
                    .orElseThrow(() -> new RuntimeException("Accompagnant introuvable avec ID: " + accompagnantId));
            Reservation r = reservationService.reserver(seanceId, accompagnant);
            
            // Envoyer un message WebSocket
            messagingTemplate.convertAndSend("/topic/calendrier", "Rafraichir");
            
            return ResponseEntity.ok(r);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/accepter")
    public ResponseEntity<Reservation> accepter(@PathVariable Long id) {
        Reservation r = reservationService.accepter(id);
        messagingTemplate.convertAndSend("/topic/calendrier", "Rafraichir");
        return ResponseEntity.ok(r);
    }

    @PutMapping("/{id}/refuser")
    public ResponseEntity<Reservation> refuser(@PathVariable Long id) {
        Reservation r = reservationService.annulerOuRefuser(id, true);
        messagingTemplate.convertAndSend("/topic/calendrier", "Rafraichir");
        return ResponseEntity.ok(r);
    }
    
    @PutMapping("/{id}/annuler")
    public ResponseEntity<Reservation> annuler(@PathVariable Long id) {
        Reservation r = reservationService.annulerOuRefuser(id, false);
        messagingTemplate.convertAndSend("/topic/calendrier", "Rafraichir");
        return ResponseEntity.ok(r);
    }

    @PutMapping("/{id}/presence")
    public ResponseEntity<Reservation> marquerPresence(@PathVariable Long id, @RequestParam boolean present) {
        Reservation r = reservationService.marquerPresence(id, present);
        messagingTemplate.convertAndSend("/topic/calendrier", "Rafraichir");
        return ResponseEntity.ok(r);
    }
}
