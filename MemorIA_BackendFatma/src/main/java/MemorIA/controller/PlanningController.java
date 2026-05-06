package MemorIA.controller;

import MemorIA.dto.PatientAssignmentDTO;
import MemorIA.dto.AdherenceStatsDTO;
import MemorIA.dto.CreateReminderRequestDTO;
import MemorIA.entity.Planning.Reminder;
import MemorIA.service.IPlanningService;
import MemorIA.service.IReminderService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/planning")
@CrossOrigin(origins = "*")
public class PlanningController {

    private final IPlanningService planningService;
    private final IReminderService reminderService;

    public PlanningController(IPlanningService planningService, IReminderService reminderService) {
        this.planningService = planningService;
        this.reminderService = reminderService;
    }

    /**
     * Récupère les patients du médecin
     * GET /api/planning/patients/doctor/{doctorId}
     */
    @GetMapping("/patients/doctor/{doctorId}")
    public ResponseEntity<?> getDoctorPatients(@PathVariable Long doctorId) {
        try {
            List<MemorIA.entity.Patient> patients = planningService.getDoctorPatients(doctorId);
            return ResponseEntity.ok(patients);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de la récupération des patients");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // ========== CAREGIVER ENDPOINTS ==========

    /**
     * Récupère les patients assignés à l'aidant actuel
     * GET /api/planning/caregivers/my-patients
     */
    @GetMapping("/caregivers/my-patients")
    public ResponseEntity<?> getMyPatients(
            @RequestParam(required = false, defaultValue = "1") Long caregiverId
    ) {
        try {
            // TODO: Récupérer caregiverId depuis Authentication quand JWT sera implémenté
            List<PatientAssignmentDTO> patients = planningService.getCaregiverPatients(caregiverId);
            return ResponseEntity.ok(patients);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de la récupération des patients");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Récupère tous les rappels d'un patient pour une date donnée (ou aujourd'hui par défaut)
     * GET /api/planning/patients/{patientId}/reminders?date=2026-03-01
     */
    @GetMapping("/patients/{patientId}/reminders")
    public ResponseEntity<?> getPatientReminders(
            @PathVariable Long patientId,
            @RequestParam(required = false) String date
    ) {
        try {
            LocalDate targetDate = date != null ? LocalDate.parse(date) : LocalDate.now();
            List<Reminder> reminders = planningService.getRemindersForDate(patientId, targetDate);
            return ResponseEntity.ok(reminders);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de la récupération des rappels");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Récupère les événements calendrier pour une plage de dates
     * GET /api/planning/patients/{patientId}/calendar-events?startDate=2026-03-01&endDate=2026-03-31
     */
    @GetMapping("/patients/{patientId}/calendar-events")
    public ResponseEntity<?> getCalendarEvents(
            @PathVariable Long patientId,
            @RequestParam String startDate,
            @RequestParam String endDate
    ) {
        try {
            List<Map<String, Object>> events = planningService.getCalendarEvents(
                    patientId,
                    LocalDate.parse(startDate),
                    LocalDate.parse(endDate)
            );
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de la récupération des événements");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Récupère les statistiques d'observance du patient
     * GET /api/planning/patients/{patientId}/stats?days=30
     */
    @GetMapping("/patients/{patientId}/stats")
    public ResponseEntity<?> getAdherenceStats(
            @PathVariable Long patientId,
            @RequestParam(defaultValue = "30") Integer days
    ) {
        try {
            AdherenceStatsDTO stats = planningService.getAdherenceStats(patientId, days);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors du calcul des statistiques");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Marque un rappel comme confirmé
     * PATCH /api/planning/reminders/{reminderId}/confirm
     */
    @PatchMapping("/reminders/{reminderId}/confirm")
    public ResponseEntity<?> confirmReminder(@PathVariable Long reminderId) {
        try {
            Reminder reminder = planningService.confirmReminder(reminderId);
            return ResponseEntity.ok(reminder);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Rappel introuvable");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * Reporte un rappel à une nouvelle date/heure
     * PATCH /api/planning/reminders/{reminderId}/delay
     * Body: { "newDate": "2026-03-15", "newTime": "14:30" }
     */
    @PatchMapping("/reminders/{reminderId}/delay")
    public ResponseEntity<?> delayReminder(
            @PathVariable Long reminderId,
            @RequestBody Map<String, String> body
    ) {
        try {
            String newDateStr = body.get("newDate");
            String newTimeStr = body.get("newTime");

            if (newDateStr == null || newTimeStr == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Paramètres manquants");
                error.put("message", "newDate et newTime sont requis");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
            }

            LocalDate newDate = LocalDate.parse(newDateStr);
            LocalTime newTime = LocalTime.parse(newTimeStr);

            Reminder reminder = planningService.delayReminder(reminderId, newDate, newTime);
            return ResponseEntity.ok(reminder);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors du report");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * Supprime un rappel (soft delete)
     * DELETE /api/planning/reminders/{reminderId}
     */
    @DeleteMapping("/reminders/{reminderId}")
    public ResponseEntity<?> deleteReminder(@PathVariable Long reminderId) {
        try {
            planningService.deleteReminder(reminderId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Rappel introuvable");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * Crée un nouveau rappel avec gestion complète de la récurrence.
     * POST /api/reminders
     * Body: CreateReminderRequestDTO
     *
     * Retourne la liste de tous les rappels créés :
     *  - 1 élément si recurrenceType = NONE
     *  - N éléments si DAILY / WEEKLY / MONTHLY (maître + occurrences)
     */
    @PostMapping("/reminders")
    public ResponseEntity<?> createReminderWithRecurrence(
            @RequestBody CreateReminderRequestDTO dto
    ) {
        try {
            if (dto.getPatientId() == null || dto.getTitle() == null || dto.getReminderDate() == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Champs obligatoires manquants : patientId, title, reminderDate");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
            }
            List<Reminder> created = reminderService.createReminderWithRecurrence(dto);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", created.size());
            response.put("reminders", created);
            response.put("message", created.size() == 1
                ? "Rappel créé avec succès"
                : created.size() + " rappels créés (récurrence " + dto.getRecurrenceType() + ")");
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de la création du rappel");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * Retourne les événements calendrier visibles pour une plage de dates.
     * Inclut les occurrences récurrentes générées.
     * GET /api/patients/{patientId}/reminders/calendar?start=2026-03-01&end=2026-03-31
     */
    @GetMapping("/patients/{patientId}/reminders/calendar")
    public ResponseEntity<?> getCalendarReminders(
            @PathVariable Long patientId,
            @RequestParam String start,
            @RequestParam String end
    ) {
        try {
            List<Map<String, Object>> events = reminderService.getCalendarEvents(
                    patientId,
                    LocalDate.parse(start),
                    LocalDate.parse(end)
            );
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors du chargement du calendrier");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Crée un nouveau rappel (ancien endpoint conservé pour compatibilité)
     * POST /api/planning/patients/{patientId}/reminders
     */
    @PostMapping("/patients/{patientId}/reminders")
    public ResponseEntity<?> createReminder(
            @PathVariable Long patientId,
            @RequestBody Reminder reminder
    ) {
        try {
            reminder.setPatientId(patientId);
            Reminder created = planningService.createReminder(reminder);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de la création");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * Reporte automatiquement tous les rappels PENDING non confirmés
     * POST /api/planning/patients/{patientId}/reminders/auto-delay
     */
    @PostMapping("/patients/{patientId}/reminders/auto-delay")
    public ResponseEntity<?> autoDelayPendingReminders(@PathVariable Long patientId) {
        try {
            int count = planningService.autoDelayPendingReminders(patientId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", count);
            response.put("message", count + " rappel(s) reporté(s) automatiquement");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors du report automatique");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // ========== PATIENT ENDPOINTS ==========

    /**
     * Récupère le planning du jour pour le patient connecté
     * GET /api/planning/patients/{patientId}/today
     */
    @GetMapping("/patients/{patientId}/today")
    public ResponseEntity<?> getTodayReminders(@PathVariable Long patientId) {
        try {
            LocalDate today = LocalDate.now();
            List<Reminder> reminders = planningService.getRemindersForDate(patientId, today);
            return ResponseEntity.ok(reminders);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de la récupération du planning");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Complète une activité avec notes optionnelles
     * PATCH /api/planning/reminders/{reminderId}/complete
     */
    @PatchMapping("/reminders/{reminderId}/complete")
    public ResponseEntity<?> completeActivity(
            @PathVariable Long reminderId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        try {
            String notes = body != null ? body.get("notes") : null;
            Reminder reminder = planningService.confirmReminder(reminderId);

            // Ajouter les notes si fournies
            if (notes != null && !notes.isEmpty()) {
                reminder.setNotes(notes);
            }

            return ResponseEntity.ok(reminder);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Rappel introuvable");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * Exporte le planning hebdomadaire en PDF
     * GET /api/planning/patients/{patientId}/export-pdf
     */
    @GetMapping("/patients/{patientId}/export-pdf")
    public ResponseEntity<?> exportWeeklyPlanningPDF(@PathVariable Long patientId) {
        try {
            byte[] pdfContent = planningService.generateWeeklyPlanningPDF(patientId);
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=planning_patient_" + patientId + ".pdf")
                    .header("Content-Type", "application/pdf")
                    .body(pdfContent);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de la génération du PDF");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Health check endpoint
     * GET /api/planning/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "Planning API");
        health.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.ok(health);
    }
}