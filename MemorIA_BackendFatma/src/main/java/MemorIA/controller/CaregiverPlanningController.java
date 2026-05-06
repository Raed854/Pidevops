package MemorIA.controller;

import MemorIA.dto.CaregiverPatientDTO;
import MemorIA.entity.CaregiverLink;
import MemorIA.entity.Patient;
import MemorIA.entity.User;
import MemorIA.repository.CaregiverLinkRepository;
import MemorIA.repository.PatientRepository;
import MemorIA.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Controller pour les fonctionnalités Planning côté ACCOMPAGNANT (Caregiver).
 *
 * Endpoints :
 *   GET  /api/caregivers/my-patients?userId={id}   → liste patients assignés
 *   GET  /api/caregivers/my-patients?userId={id}&status=accepted  → filtrés par statut
 */
@RestController
@RequestMapping("/api/caregivers")
@CrossOrigin(origins = "*")
public class CaregiverPlanningController {

    private final CaregiverLinkRepository caregiverLinkRepository;
    private final PatientRepository       patientRepository;
    private final UserRepository          userRepository;

    private static final DateTimeFormatter ISO_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    public CaregiverPlanningController(CaregiverLinkRepository caregiverLinkRepository,
                                       PatientRepository patientRepository,
                                       UserRepository userRepository) {
        this.caregiverLinkRepository = caregiverLinkRepository;
        this.patientRepository       = patientRepository;
        this.userRepository          = userRepository;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/caregivers/my-patients?userId=5  OU  ?userEmail=john@mail.com
    //
    // Stratégie double :
    //   1. Cherche dans caregiver_links (table de liaison explicite)
    //   2. Si vide → cherche via patient.accompagnant_id (relation directe)
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/my-patients")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyPatients(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false, defaultValue = "accepted") String status
    ) {
        // ── Résoudre l'ID du caregiver ────────────────────────────────────
        Long caregiverId = null;

        if (userId != null && !userId.isBlank()
                && !userId.equalsIgnoreCase("undefined")
                && !userId.equalsIgnoreCase("null")) {
            try { caregiverId = Long.parseLong(userId); }
            catch (NumberFormatException ignored) {}
        }

        if (caregiverId == null && userEmail != null && !userEmail.isBlank()) {
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (userOpt.isPresent()) caregiverId = userOpt.get().getId();
        }

        if (caregiverId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error",   "Paramètre manquant",
                    "message", "Fournir ?userId=<id> ou ?userEmail=<email>"
            ));
        }

        try {
            // ── Stratégie 1 : caregiver_links ────────────────────────────
            List<CaregiverLink> links = List.of();
            try {
                links = caregiverLinkRepository.findByCaregiverIdAndStatus(caregiverId, status);
            } catch (Exception dbEx) {
                System.err.println("[CaregiverPlanning] caregiver_links query error: " + dbEx.getMessage());
            }

            if (!links.isEmpty()) {
                List<CaregiverPatientDTO> dtos = links.stream()
                        .filter(l -> l != null && l.getPatient() != null)
                        .map(l -> { try { return toDTO(l); } catch (Exception e) { return null; } })
                        .filter(d -> d != null)
                        .collect(Collectors.toList());
                return ResponseEntity.ok(dtos);
            }

            // ── Stratégie 2 : patient.accompagnant_id (relation directe) ─
            System.out.println("[CaregiverPlanning] Pas de caregiver_link → fallback via patient.accompagnant_id=" + caregiverId);
            List<Patient> patients = List.of();
            try {
                patients = patientRepository.findAllByAccompagnantUserId(caregiverId);
            } catch (Exception dbEx) {
                System.err.println("[CaregiverPlanning] findByAccompagnantId error: " + dbEx.getMessage());
            }

            if (patients.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            final Long finalCaregiverId = caregiverId;
            List<CaregiverPatientDTO> dtos = patients.stream()
                    .map(p -> { try { return toDTOFromPatient(p, finalCaregiverId); } catch (Exception e) { return null; } })
                    .filter(d -> d != null)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(dtos);

        } catch (Exception e) {
            System.err.println("[CaregiverPlanning] getMyPatients 500: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error",   "Erreur interne",
                    "message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue"
            ));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/caregivers/link
    // Body: { "caregiverId": 3, "patientId": 5, "isPrimary": true }
    // Crée ou met à jour un lien accompagnant ↔ patient
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/link")
    @Transactional
    public ResponseEntity<?> linkCaregiverToPatient(@RequestBody Map<String, Object> body) {
        try {
            Long caregiverId = Long.valueOf(body.get("caregiverId").toString());
            Long patientId   = Long.valueOf(body.get("patientId").toString());
            boolean isPrimary = body.containsKey("isPrimary") && Boolean.parseBoolean(body.get("isPrimary").toString());

            User caregiver = userRepository.findById(caregiverId)
                    .orElseThrow(() -> new RuntimeException("Accompagnant introuvable: " + caregiverId));
            Patient patient = patientRepository.findById(patientId)
                    .orElseThrow(() -> new RuntimeException("Patient introuvable: " + patientId));

            // Chercher lien existant ou en créer un nouveau
            CaregiverLink link = caregiverLinkRepository
                    .findByCaregiverIdAndPatientId(caregiverId, patientId)
                    .orElseGet(CaregiverLink::new);

            link.setCaregiver(caregiver);
            link.setPatient(patient);
            link.setStatus("accepted");
            link.setIsPrimary(isPrimary);

            CaregiverLink saved = caregiverLinkRepository.save(link);

            Map<String, Object> result = new HashMap<>();
            result.put("id", saved.getId());
            result.put("caregiverId", caregiverId);
            result.put("patientId", patientId);
            result.put("status", saved.getStatus());
            result.put("isPrimary", saved.getIsPrimary());
            result.put("message", "Lien accompagnant-patient créé avec succès");

            return ResponseEntity.status(HttpStatus.CREATED).body(result);

        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de la création du lien");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Conversion CaregiverLink → CaregiverPatientDTO (null-safe)
    // ─────────────────────────────────────────────────────────────────────────
    private CaregiverPatientDTO toDTO(CaregiverLink link) {
        return toDTOFromPatient(link.getPatient(),
                link.getCaregiver() != null ? link.getCaregiver().getId() : null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Conversion Patient → CaregiverPatientDTO
    // Utilisée pour la relation directe patient.accompagnant_id
    // ─────────────────────────────────────────────────────────────────────────
    private CaregiverPatientDTO toDTOFromPatient(Patient patient, Long caregiverId) {
        CaregiverPatientDTO dto = new CaregiverPatientDTO();
        if (patient == null) return dto;

        dto.setPatientId(patient.getId());
        dto.setId(patient.getId()); // pas de CaregiverLink → on utilise l'id patient
        dto.setCaregiverId(caregiverId);
        dto.setStatus("accepted");
        dto.setIsPrimary(true); // relation directe = accompagnant principal

        // Date d'assignation
        try {
            if (patient.getAccompagnantAssignedAt() != null) {
                dto.setAssignedDate(patient.getAccompagnantAssignedAt().format(ISO_FORMATTER));
            }
        } catch (Exception ignored) {}

        // Nom / Prénom depuis user
        String nom = "", prenom = "";
        try {
            if (patient.getUser() != null) {
                nom    = patient.getUser().getNom()    != null ? patient.getUser().getNom()    : "";
                prenom = patient.getUser().getPrenom() != null ? patient.getUser().getPrenom() : "";
            }
        } catch (Exception ignored) {}

        dto.setPatientName(nom);
        dto.setPatientPrenom(prenom);

        // Initiales
        String initials = "";
        if (!prenom.isEmpty()) initials += prenom.charAt(0);
        if (!nom.isEmpty())    initials += nom.charAt(0);
        dto.setInitials(initials.toUpperCase());

        // Âge
        try {
            if (patient.getDateNaissance() != null) {
                dto.setAge(Period.between(patient.getDateNaissance(), LocalDate.now()).getYears());
            }
        } catch (Exception ignored) {}

        dto.setAlzheimerStage("LEGER");
        dto.setAdherenceRate(patient.getAdherenceRate() != null ? patient.getAdherenceRate() : 0.0);

        return dto;
    }
}


















