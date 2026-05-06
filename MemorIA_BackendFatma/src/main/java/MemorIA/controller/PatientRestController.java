package MemorIA.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import MemorIA.dto.PatientDTO;
import MemorIA.dto.PatientListDTO;
import MemorIA.dto.ReminderDTO;
import MemorIA.entity.Patient;
import MemorIA.entity.Planning.Priority;
import MemorIA.entity.Planning.Reminder;
import MemorIA.entity.Planning.ReminderStatus;
import MemorIA.entity.Planning.ReminderType;
import MemorIA.mapper.ReminderMapper;
import MemorIA.service.IPatientService;
import MemorIA.service.IPlanningService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/patients")
@CrossOrigin(origins = "*")
public class PatientRestController {

    @Autowired
    private IPatientService patientService;

    @Autowired
    private IPlanningService planningService;

    @Autowired
    private ReminderMapper reminderMapper;

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<?> getPatientsByDoctor(@PathVariable Long doctorId) {
        try {
            List<PatientDTO> patients = patientService.getPatientsByDoctor(doctorId);
            return ResponseEntity.ok(patients);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to load doctor's patients");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Unknown error");
            error.put("doctorId", doctorId.toString());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/{id}")
    public PatientDTO getPatient(@PathVariable Long id) {
        return patientService.getPatientById(id);
    }

    @GetMapping("/search")
    public List<PatientDTO> searchPatients(
            @RequestParam String term,
            @RequestParam(required = false, defaultValue = "1") Long doctorId
    ) {
        return patientService.searchPatients(term, doctorId);
    }

    /**
     * Récupère tous les rappels d'un patient pour une date donnée
     * GET /api/patients/{patientId}/reminders?date=2026-03-03
     */
    @GetMapping("/{patientId}/reminders")
    public ResponseEntity<?> getPatientReminders(
            @PathVariable Long patientId,
            @RequestParam(required = false) String date
    ) {
        try {
            LocalDate targetDate = (date != null && !date.isBlank())
                    ? LocalDate.parse(date)
                    : LocalDate.now();

            List<Reminder> reminders = planningService.getRemindersForDate(patientId, targetDate);
            if (reminders == null) reminders = List.of();

            List<ReminderDTO> reminderDTOs = reminders.stream()
                    .filter(r -> r != null)
                    .map(r -> {
                        try { return reminderMapper.toDTO(r); }
                        catch (Exception e) { return null; }
                    })
                    .filter(r -> r != null)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(reminderDTOs);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de la récupération des rappels");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Confirme un rappel
     * PATCH /api/patients/{patientId}/reminders/{reminderId}/confirm
     */
    @PatchMapping("/{patientId}/reminders/{reminderId}/confirm")
    public ResponseEntity<?> confirmReminder(
            @PathVariable Long patientId,
            @PathVariable Long reminderId
    ) {
        try {
            Reminder reminder = planningService.confirmReminder(reminderId);
            ReminderDTO reminderDTO = reminderMapper.toDTO(reminder);
            return ResponseEntity.ok(reminderDTO);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de la confirmation du rappel");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Stats d'observance d'un patient
     * GET /api/patients/{patientId}/stats/adherence?days=30
     */
    @GetMapping("/{patientId}/stats/adherence")
    public ResponseEntity<?> getAdherenceStats(
            @PathVariable Long patientId,
            @RequestParam(required = false, defaultValue = "30") Integer days
    ) {
        try {
            return ResponseEntity.ok(planningService.getAdherenceStats(patientId, days));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur stats observance");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Export PDF du planning hebdomadaire
     * GET /api/patients/{patientId}/planning/export-pdf
     */
    @GetMapping("/{patientId}/planning/export-pdf")
    public ResponseEntity<?> exportWeeklyPDF(@PathVariable Long patientId) {
        try {
            byte[] pdf = planningService.generateWeeklyPlanningPDF(patientId);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/pdf")
                    .header("Content-Disposition", "attachment; filename=planning_" + patientId + ".pdf")
                    .body(pdf);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur export PDF");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Reporter automatiquement les rappels non confirmés passés
     * POST /api/patients/{patientId}/reminders/auto-delay
     */
    @PostMapping("/{patientId}/reminders/auto-delay")
    public ResponseEntity<?> autoDelayReminders(@PathVariable Long patientId) {
        try {
            int count = planningService.autoDelayPendingReminders(patientId);
            Map<String, Object> result = new HashMap<>();
            result.put("count", count);
            result.put("message", count + " rappel(s) reporté(s) au lendemain.");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur auto-delay");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Créer un rappel pour un patient
     * POST /api/patients/{patientId}/reminders
     * Accepte { scheduledTime, title, description, type, priority, ... }
     */
    @PostMapping("/{patientId}/reminders")
    public ResponseEntity<?> createReminder(
            @PathVariable Long patientId,
            @RequestBody Map<String, Object> body
    ) {
        try {
            Reminder reminder = new Reminder();
            reminder.setPatientId(patientId);

            // Titre
            if (body.containsKey("title") && body.get("title") != null) {
                reminder.setTitle(body.get("title").toString());
            }
            // Description
            if (body.containsKey("description") && body.get("description") != null) {
                reminder.setDescription(body.get("description").toString());
            }

            // scheduledTime → reminderDate + reminderTime
            // Gère : "2026-03-04T15:00", "2026-03-04T15:00:00", "2026-03-04T15:00:00.000Z"
            if (body.containsKey("scheduledTime") && body.get("scheduledTime") != null) {
                String scheduledTime = body.get("scheduledTime").toString().replace("Z", "");
                try {
                    // Normaliser à 19 chars (yyyy-MM-dd'T'HH:mm:ss)
                    if (scheduledTime.length() == 16) {
                        scheduledTime = scheduledTime + ":00"; // Ajouter les secondes
                    } else if (scheduledTime.length() > 19) {
                        scheduledTime = scheduledTime.substring(0, 19);
                    }
                    LocalDateTime dt = LocalDateTime.parse(scheduledTime);
                    reminder.setReminderDate(dt.toLocalDate());
                    reminder.setReminderTime(dt.toLocalTime());
                } catch (Exception ignored) {
                    try {
                        reminder.setReminderDate(LocalDate.parse(scheduledTime.substring(0, 10)));
                    } catch (Exception ignored2) {}
                }
            }

            // Type : mapping frontend (minuscules) → enum backend
            if (body.containsKey("type") && body.get("type") != null) {
                reminder.setType(mapReminderType(body.get("type").toString()));
            } else {
                reminder.setType(ReminderType.OTHER);
            }

            // Priority : LOW/NORMAL/HIGH/URGENT
            if (body.containsKey("priority") && body.get("priority") != null) {
                try {
                    reminder.setPriority(Priority.valueOf(body.get("priority").toString().toUpperCase()));
                } catch (Exception ignored) {
                    reminder.setPriority(Priority.NORMAL);
                }
            } else {
                reminder.setPriority(Priority.NORMAL);
            }

            // Status par défaut
            reminder.setStatus(ReminderStatus.PENDING);

            Reminder saved = planningService.createReminder(reminder);
            return ResponseEntity.status(HttpStatus.CREATED).body(reminderMapper.toDTO(saved));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur création rappel");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Mappe le type frontend (minuscules) vers l'enum backend ReminderType
     */
    private ReminderType mapReminderType(String frontendType) {
        if (frontendType == null) return ReminderType.OTHER;
        switch (frontendType.toLowerCase()) {
            case "medication":    return ReminderType.MEDICATION;
            case "appointment":   return ReminderType.MEDICAL_APPOINTMENT;
            case "activity":      return ReminderType.PHYSICAL_ACTIVITY;
            case "test":          return ReminderType.COGNITIVE_TEST;
            case "meal":          return ReminderType.MEAL;
            case "hygiene":       return ReminderType.HYGIENE;
            case "walk":          return ReminderType.WALK;
            case "hydration":     return ReminderType.HYDRATION;
            case "sleep_routine": return ReminderType.SLEEP_ROUTINE;
            case "vital_signs":   return ReminderType.VITAL_SIGNS;
            case "family_call":   return ReminderType.FAMILY_CALL;
            default:
                try { return ReminderType.valueOf(frontendType.toUpperCase()); }
                catch (Exception ignored) { return ReminderType.OTHER; }
        }
    }

    /**
     * Supprimer un rappel
     * DELETE /api/reminders/{reminderId}
     * (aussi accessible via /api/patients/reminders/{reminderId} pour compatibilité)
     */
    @DeleteMapping("/reminders/{reminderId}")
    public ResponseEntity<?> deleteReminder(@PathVariable Long reminderId) {
        try {
            planningService.deleteReminder(reminderId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur suppression rappel");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Reporter un rappel à une nouvelle heure
     * PATCH /api/reminders/{reminderId}/delay
     * Body: { "newScheduledTime": "2026-03-04T15:00:00" }
     */
    @PatchMapping("/reminders/{reminderId}/delay")
    public ResponseEntity<?> delayReminder(
            @PathVariable Long reminderId,
            @RequestBody Map<String, String> body
    ) {
        try {
            String newScheduledTime = body.get("newScheduledTime");
            if (newScheduledTime == null || newScheduledTime.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Le champ 'newScheduledTime' est requis"));
            }
            // Normaliser le format : gérer HH:mm sans secondes et le 'Z' final
            newScheduledTime = newScheduledTime.replace("Z", "");
            if (newScheduledTime.length() == 16) newScheduledTime = newScheduledTime + ":00";
            if (newScheduledTime.length() > 19) newScheduledTime = newScheduledTime.substring(0, 19);
            LocalDateTime newDt = LocalDateTime.parse(newScheduledTime);
            Reminder updated = planningService.delayReminder(reminderId, newDt.toLocalDate(), newDt.toLocalTime());
            return ResponseEntity.ok(reminderMapper.toDTO(updated));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur report rappel");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping({"/profile/{userId}", "/profiles/{userId}"})
    public ResponseEntity<?> getProfileByUserId(@PathVariable Long userId) {
        try {
            return patientService.getByUserId(userId)
                    .<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElseGet(() -> {
                        // Retourne un objet vide pour un premier login au lieu d'un 404 bruyant.
                        Patient empty = new Patient();
                        empty.setId(userId);
                        return ResponseEntity.ok(empty);
                    });
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur récupération profil patient");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PutMapping({"/profile/{userId}", "/profiles/{userId}"})
    public ResponseEntity<?> upsertProfile(@PathVariable Long userId, @RequestBody Patient patientPayload) {
        try {
            return ResponseEntity.ok(patientService.upsertProfile(userId, patientPayload));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur sauvegarde profil patient");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/current-user")
    public ResponseEntity<List<PatientListDTO>> getPatientsForCurrentUser() {
        return ResponseEntity.ok(patientService.getPatientsForCurrentUser());
    }
}

