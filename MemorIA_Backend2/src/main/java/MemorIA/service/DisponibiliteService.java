package MemorIA.service;

import MemorIA.entity.Traitements.Disponibilite;
import MemorIA.entity.User;
import MemorIA.entity.role.StatutDisponibilite;
import MemorIA.repository.DisponibiliteRepository;
import MemorIA.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class DisponibiliteService {

    @Autowired
    private DisponibiliteRepository disponibiliteRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Récupérer toutes les disponibilités
     */
    public List<Disponibilite> getAllDisponibilites() {
        return disponibiliteRepository.findAll();
    }

    /**
     * Créer une nouvelle disponibilité
     */
    public Disponibilite createDisponibilite(Disponibilite disponibilite) {
        Long userId = disponibilite.getUserId() != null
                ? disponibilite.getUserId()
                : (disponibilite.getUser() != null ? disponibilite.getUser().getId() : null);

        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        disponibilite.setUser(user);

        return disponibiliteRepository.save(disponibilite);
    }

    /**
     * Récupérer une disponibilité par ID
     */
    public Optional<Disponibilite> getDisponibiliteById(Long id) {
        return disponibiliteRepository.findById(id);
    }

    /**
     * Mettre à jour une disponibilité
     */
    public Disponibilite updateDisponibilite(Long id, Disponibilite disponibiliteDetails) {
        Optional<Disponibilite> disponibilite = disponibiliteRepository.findById(id);
        if (disponibilite.isPresent()) {
            Disponibilite d = disponibilite.get();
            if (disponibiliteDetails.getDate() != null) {
                d.setDate(disponibiliteDetails.getDate());
            }
            if (disponibiliteDetails.getHeureDebut() != null) {
                d.setHeureDebut(disponibiliteDetails.getHeureDebut());
            }
            if (disponibiliteDetails.getHeureFin() != null) {
                d.setHeureFin(disponibiliteDetails.getHeureFin());
            }
            if (disponibiliteDetails.getStatut() != null) {
                d.setStatut(disponibiliteDetails.getStatut());
            }
            return disponibiliteRepository.save(d);
        }
        throw new RuntimeException("Disponibilite not found");
    }

    /**
     * Supprimer une disponibilité
     */
    public void deleteDisponibilite(Long id) {
        disponibiliteRepository.deleteById(id);
    }

    /**
     * Récupérer toutes les disponibilités d'un utilisateur
     */
    public List<Disponibilite> getDisponibilitesByUserId(Long userId) {
        return disponibiliteRepository.findByUserId(userId);
    }

    /**
     * Récupérer les disponibilités d'un utilisateur pour une date
     */
    public List<Disponibilite> getDisponibilitesByUserIdAndDate(Long userId, LocalDate date) {
        return disponibiliteRepository.findByUserIdAndDate(userId, date);
    }

    /**
     * Récupérer les disponibilités libres d'un utilisateur
     */
    public List<Disponibilite> getDisponibiliteLibresParUser(Long userId) {
        return disponibiliteRepository.findByUserIdAndStatut(userId, StatutDisponibilite.LIBRE);
    }

    /**
     * Récupérer les disponibilités libres d'un utilisateur pour une date donnée
     */
    public List<Disponibilite> getDisponibiliteLibresParUserAndDate(Long userId, LocalDate date) {
        return disponibiliteRepository.findByUserIdAndDateAndStatut(userId, date, StatutDisponibilite.LIBRE);
    }

    /**
     * Récupérer les disponibilités par statut
     */
    public List<Disponibilite> getDisponibilitesByStatut(StatutDisponibilite statut) {
        return disponibiliteRepository.findByStatut(statut);
    }

    /**
     * Réserver une disponibilité
     */
    public Disponibilite reserverDisponibilite(Long id) {
        Optional<Disponibilite> disponibilite = disponibiliteRepository.findById(id);
        if (disponibilite.isPresent()) {
            Disponibilite d = disponibilite.get();
            d.setStatut(StatutDisponibilite.RESERVE);
            return disponibiliteRepository.save(d);
        }
        throw new RuntimeException("Disponibilite not found");
    }

    /**
     * Libérer une disponibilité
     */
    public Disponibilite libererDisponibilite(Long id) {
        Optional<Disponibilite> disponibilite = disponibiliteRepository.findById(id);
        if (disponibilite.isPresent()) {
            Disponibilite d = disponibilite.get();
            d.setStatut(StatutDisponibilite.LIBRE);
            return disponibiliteRepository.save(d);
        }
        throw new RuntimeException("Disponibilite not found");
    }
}
