package MemorIA.controller;

import MemorIA.dto.DisponibiliteResponseDto;
import MemorIA.entity.Traitements.Disponibilite;
import MemorIA.entity.role.StatutDisponibilite;
import MemorIA.service.DisponibiliteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/disponibilites")
public class DisponibiliteController {

    @Autowired
    private DisponibiliteService disponibiliteService;

    /**
     * Récupérer toutes les disponibilités (avec filtre optionnel par statut)
     */
    @GetMapping
    public ResponseEntity<List<Disponibilite>> getAllDisponibilites(
            @RequestParam(required = false) StatutDisponibilite statut) {
        try {
            List<Disponibilite> disponibilites = statut != null
                    ? disponibiliteService.getDisponibilitesByStatut(statut)
                    : disponibiliteService.getAllDisponibilites();
            return new ResponseEntity<>(disponibilites, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Créer une nouvelle disponibilité
     */
    @PostMapping
    public ResponseEntity<DisponibiliteResponseDto> createDisponibilite(@RequestBody Disponibilite disponibilite) {
        Disponibilite newDisponibilite = disponibiliteService.createDisponibilite(disponibilite);
        return new ResponseEntity<>(DisponibiliteResponseDto.fromEntity(newDisponibilite), HttpStatus.CREATED);
    }

    /**
     * Récupérer une disponibilité par ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Disponibilite> getDisponibiliteById(@PathVariable Long id) {
        Optional<Disponibilite> disponibilite = disponibiliteService.getDisponibiliteById(id);
        if (disponibilite.isPresent()) {
            return new ResponseEntity<>(disponibilite.get(), HttpStatus.OK);
        }
        return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
    }

    /**
     * Mettre à jour une disponibilité
     */
    @PutMapping("/{id}")
    public ResponseEntity<DisponibiliteResponseDto> updateDisponibilite(
            @PathVariable Long id,
            @RequestBody Disponibilite disponibiliteDetails) {
        try {
            Disponibilite updatedDisponibilite = disponibiliteService.updateDisponibilite(id, disponibiliteDetails);
            return new ResponseEntity<>(DisponibiliteResponseDto.fromEntity(updatedDisponibilite), HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Supprimer une disponibilité
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDisponibilite(@PathVariable Long id) {
        try {
            disponibiliteService.deleteDisponibilite(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Récupérer toutes les disponibilités d'un utilisateur
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<DisponibiliteResponseDto>> getDisponibilitesByUserId(@PathVariable Long userId) {
        try {
            List<Disponibilite> disponibilites = disponibiliteService.getDisponibilitesByUserId(userId);
            List<DisponibiliteResponseDto> dtos = disponibilites.stream()
                    .map(DisponibiliteResponseDto::fromEntity)
                    .toList();
            return new ResponseEntity<>(dtos, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Récupérer les disponibilités d'un utilisateur pour une date donnée
     */
    @GetMapping("/user/{userId}/date")
    public ResponseEntity<List<Disponibilite>> getDisponibilitesByUserIdAndDate(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            List<Disponibilite> disponibilites = disponibiliteService.getDisponibilitesByUserIdAndDate(userId, date);
            return new ResponseEntity<>(disponibilites, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Récupérer les disponibilités libres d'un utilisateur
     */
    @GetMapping("/user/{userId}/libres")
    public ResponseEntity<List<Disponibilite>> getDisponibiliteLibresParUser(@PathVariable Long userId) {
        try {
            List<Disponibilite> disponibilites = disponibiliteService.getDisponibiliteLibresParUser(userId);
            return new ResponseEntity<>(disponibilites, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Récupérer les disponibilités libres d'un utilisateur pour une date donnée
     */
    @GetMapping("/user/{userId}/libres/date")
    public ResponseEntity<List<Disponibilite>> getDisponibiliteLibresParUserAndDate(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            List<Disponibilite> disponibilites = disponibiliteService.getDisponibiliteLibresParUserAndDate(userId, date);
            return new ResponseEntity<>(disponibilites, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Réserver une disponibilité
     */
    @PutMapping("/{id}/reserver")
    public ResponseEntity<Disponibilite> reserverDisponibilite(@PathVariable Long id) {
        try {
            Disponibilite disponibilite = disponibiliteService.reserverDisponibilite(id);
            return new ResponseEntity<>(disponibilite, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Libérer une disponibilité
     */
    @PutMapping("/{id}/liberer")
    public ResponseEntity<Disponibilite> libererDisponibilite(@PathVariable Long id) {
        try {
            Disponibilite disponibilite = disponibiliteService.libererDisponibilite(id);
            return new ResponseEntity<>(disponibilite, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }
}
