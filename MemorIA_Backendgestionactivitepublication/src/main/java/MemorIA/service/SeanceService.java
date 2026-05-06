package MemorIA.service;

import MemorIA.entity.Seance;
import MemorIA.entity.StatutSeance;
import MemorIA.repository.SeanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

import org.springframework.messaging.simp.SimpMessagingTemplate;

@Service
@RequiredArgsConstructor
public class SeanceService {

    private final SeanceRepository seanceRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private void notifyUpdate() {
        messagingTemplate.convertAndSend("/topic/seances", "UPDATE_SEANCES");
    }

    public List<Seance> getAllSeances() {
        return seanceRepository.findAll();
    }

    public Seance getSeanceById(Long id) {
        return seanceRepository.findById(id).orElse(null);
    }

    public List<Seance> getSeancesByActivite(Long activiteId) {
        return seanceRepository.findByActiviteId(activiteId);
    }

    public List<Seance> getAvailableSeances() {
        return seanceRepository.findByStatut(StatutSeance.DISPONIBLE);
    }

    public Seance saveSeance(Seance seance) {
        Seance saved = seanceRepository.save(seance);
        notifyUpdate();
        return saved;
    }

    public void deleteSeance(Long id) {
        seanceRepository.deleteById(id);
        notifyUpdate();
    }

    public Seance updateStatut(Long id, StatutSeance statut) {
        Seance seance = seanceRepository.findById(id).orElseThrow(() -> new RuntimeException("Séance introuvable"));
        seance.setStatut(statut);
        Seance saved = seanceRepository.save(seance);
        notifyUpdate();
        return saved;
    }
}
