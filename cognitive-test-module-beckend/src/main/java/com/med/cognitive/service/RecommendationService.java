package com.med.cognitive.service;

import com.med.cognitive.dto.PatientOptionDto;
import com.med.cognitive.entity.Patient;
import com.med.cognitive.entity.Recommendation;
import com.med.cognitive.entity.enums.PriorityLevel;
import com.med.cognitive.entity.enums.RecommendStatus;
import com.med.cognitive.exception.ResourceNotFoundException;
import com.med.cognitive.repository.PatientRepository;
import com.med.cognitive.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RecommendationService {

    private final RecommendationRepository repository;
    private final PatientRepository patientRepository;

    // ─────────────── LECTURE ───────────────

    public Recommendation getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recommendation not found with id: " + id));
    }

    /** Toutes les recommandations d'un médecin (triées par date DESC) */
    public List<Recommendation> getByClinicianId(Long clinicianId) {
        return repository.findByClinicianIdOrderByCreatedAtDesc(clinicianId);
    }

    /** Toutes les recommandations d'un patient (triées par date DESC) */
    public List<Recommendation> getByPatientId(Long patientId) {
        return repository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    /** Recommandations destinées à l'aidant pour un patient donné */
    public List<Recommendation> getCaregiverRecommendationsByPatient(Long patientId) {
        return repository.findByPatientIdAndTargetRoleOrderByCreatedAtDesc(patientId, "CAREGIVER");
    }

    public List<Recommendation> getByRole(String role) {
        return repository.findByTargetRole(role);
    }

    public List<Recommendation> getByStatus(RecommendStatus status) {
        return repository.findByStatus(status);
    }

    // ─────────────── CRÉATION ───────────────

    public Recommendation create(Recommendation recommendation) {
        // S'assurer que les valeurs par défaut sont appliquées
        if (recommendation.getStatus() == null) {
            recommendation.setStatus(RecommendStatus.PENDING);
        }
        if (recommendation.getTargetRole() == null) {
            recommendation.setTargetRole("CAREGIVER");
        }
        return repository.save(recommendation);
    }

    // ─────────────── MISE À JOUR ───────────────

    public Recommendation update(Long id, Recommendation partial) {
        Recommendation existing = getById(id);

        if (partial.getAction() != null) {
            existing.setAction(partial.getAction());
        }
        if (partial.getPriority() != null) {
            existing.setPriority(partial.getPriority());
        }
        if (partial.getDeadline() != null) {
            existing.setDeadline(partial.getDeadline());
        }
        if (partial.getNotes() != null) {
            existing.setNotes(partial.getNotes());
        }
        if (partial.getStatus() != null) {
            existing.setStatus(partial.getStatus());
        }
        return repository.save(existing);
    }

    public Recommendation markAsCompleted(Long id, String notes, Long userId) {
        Recommendation rec = getById(id);
        rec.setStatus(RecommendStatus.COMPLETED);
        rec.setCompletedAt(LocalDateTime.now());
        rec.setCompletedBy(userId);
        if (notes != null) {
            rec.setNotes(notes);
        }
        return repository.save(rec);
    }

    public Recommendation updateStatus(Long id, RecommendStatus status, Long completedBy) {
        Recommendation rec = getById(id);
        rec.setStatus(status);
        if (status == RecommendStatus.COMPLETED) {
            rec.setCompletedAt(LocalDateTime.now());
            if (completedBy != null) {
                rec.setCompletedBy(completedBy);
            }
        }
        return repository.save(rec);
    }

    public Recommendation reassign(Long id, String newRole) {
        Recommendation rec = getById(id);
        rec.setTargetRole(newRole);
        return repository.save(rec);
    }

    // ─────────────── SUPPRESSION ───────────────

    public void delete(Long id) {
        Recommendation rec = getById(id); // Vérifie existence
        repository.delete(rec);
    }

    // ─────────────── PATIENTS POUR FORMULAIRE ───────────────

    /**
     * Retourne la liste des patients gérés par un médecin,
     * formatée pour la liste déroulante du formulaire de recommandation.
     */
    public List<PatientOptionDto> getPatientsForClinician(Long clinicianId) {
        List<Patient> patients = patientRepository.findBySoignantId(clinicianId);

        return patients.stream()
                .map(this::toPatientOptionDto)
                .collect(Collectors.toList());
    }

    // ─────────────── UTILITAIRES PRIVÉS ───────────────

    private PatientOptionDto toPatientOptionDto(Patient p) {
        PatientOptionDto dto = new PatientOptionDto();
        dto.setId(p.getId());
        dto.setNom(p.getNom() != null ? p.getNom() : "");
        dto.setPrenom(p.getPrenom() != null ? p.getPrenom() : "");

        String dateNaissanceStr = "";
        int age = 0;

        if (p.getDateNaissance() != null) {
            LocalDate birthDate = p.getDateNaissance();
            dateNaissanceStr = birthDate.format(DateTimeFormatter.ISO_LOCAL_DATE);
            age = Period.between(birthDate, LocalDate.now()).getYears();

            // Format dd/MM/yyyy pour l'affichage
            String formattedDate = birthDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            dto.setDisplayName(String.format("%s %s - %s (%d ans)",
                    dto.getPrenom(), dto.getNom(), formattedDate, age));
        } else {
            dto.setDisplayName(String.format("%s %s", dto.getPrenom(), dto.getNom()));
        }

        dto.setDateNaissance(dateNaissanceStr);
        dto.setAge(age);
        return dto;
    }
}
