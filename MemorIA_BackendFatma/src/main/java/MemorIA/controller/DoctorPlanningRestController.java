package MemorIA.controller;

import MemorIA.dto.AdherenceStatsDTO;
import MemorIA.dto.CreateReminderRequestDTO;
import MemorIA.dto.ReminderDTO;
import MemorIA.entity.Planning.Reminder;
import MemorIA.mapper.ReminderMapper;
import MemorIA.service.IAdherenceService;
import MemorIA.service.IReminderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doctor-planning")
@CrossOrigin(origins = "*")
public class DoctorPlanningRestController {

    @Autowired
    private IReminderService reminderService;

    @Autowired
    private IAdherenceService adherenceService;

    @Autowired
    private ReminderMapper reminderMapper;

    // ===== PING =====
    @GetMapping("/ping")
    public ResponseEntity<Map<String, String>> ping() {
        return ResponseEntity.ok(Map.of("status", "OK", "service", "DoctorPlanning"));
    }

    // ===== TEST REMINDER =====
    @GetMapping("/test-reminder")
    public ResponseEntity<?> testReminder() {
        try {
            ReminderDTO testDto = new ReminderDTO();
            testDto.setId(999L);
            testDto.setTitle("Test Reminder");
            testDto.setType("medication");

            LocalDateTime scheduledTime = LocalDateTime.of(LocalDate.now(), LocalTime.of(10, 0, 0));
            testDto.setScheduledTime(scheduledTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")));

            testDto.setStatus("pending");
            testDto.setPriority("normal");
            testDto.setIsRecurring(false);
            testDto.setPatientId(5L);
            testDto.setDurationMinutes(30);
            return ResponseEntity.ok(testDto);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ===== DEBUG =====
    @GetMapping("/debug/patient/{patientId}")
    public ResponseEntity<?> debug(@PathVariable Long patientId) {
        try {
            long count = reminderService.getRemindersByPatient(patientId).size();
            return ResponseEntity.ok(Map.of(
                "patientId", patientId,
                "totalReminders", count,
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getClass().getSimpleName(),
                "message", String.valueOf(e.getMessage()),
                "cause", e.getCause() != null ? e.getCause().getClass().getSimpleName() + ": " + e.getCause().getMessage() : "none"
            ));
        }
    }

    // ===== Conversion entité → DTO via ReminderMapper =====
    // Note: Utilisation du ReminderMapper pour la conversion au lieu d'une méthode locale

    @GetMapping("/reminders/patient/{patientId}")
    public ResponseEntity<?> getPatientReminders(
            @PathVariable Long patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        try {
            List<Reminder> reminders = reminderService.getRemindersByPatientBetweenDates(patientId, startDate, endDate);
            List<ReminderDTO> dtos = reminders.stream()
                    .map(reminderMapper::toDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/reminders/patient/{patientId}/date/{date}")
    public ResponseEntity<?> getPatientRemindersByDate(
            @PathVariable Long patientId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        try {
            List<Reminder> reminders = reminderService.getRemindersByPatientAndDate(patientId, date);
            List<ReminderDTO> dtos = reminders.stream()
                    .map(reminderMapper::toDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/calendar/patient/{patientId}")
    public ResponseEntity<?> getCalendarEvents(
            @PathVariable Long patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        try {
            List<Map<String, Object>> events = reminderService.getCalendarEvents(patientId, startDate, endDate);
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reminders")
    public ResponseEntity<?> createReminder(@RequestBody Reminder reminder) {
        try {
            Reminder savedReminder = reminderService.addReminder(reminder);
            return ResponseEntity.status(HttpStatus.CREATED).body(reminderMapper.toDTO(savedReminder));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Crée un rappel avec gestion complète de la récurrence.
     * POST /api/doctor-planning/reminders/with-recurrence
     *
     * Si recurrenceType != NONE, génère toutes les occurrences récurrentes
     * et retourne : { count, reminders, message }
     */
    @PostMapping("/reminders/with-recurrence")
    public ResponseEntity<?> createReminderWithRecurrence(
            @RequestBody CreateReminderRequestDTO dto
    ) {
        try {
            if (dto.getPatientId() == null || dto.getTitle() == null || dto.getReminderDate() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Champs obligatoires manquants : patientId, title, reminderDate"));
            }

            List<Reminder> created = reminderService.createReminderWithRecurrence(dto);

            List<ReminderDTO> dtos = created.stream()
                    .map(reminderMapper::toDTO)
                    .toList();

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success",  true,
                    "count",    created.size(),
                    "reminders", dtos,
                    "message",  created.size() == 1
                            ? "Rappel créé avec succès"
                            : created.size() + " rappels créés (récurrence " + dto.getRecurrenceType() + ")"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Erreur lors de la création du rappel", "message", e.getMessage()));
        }
    }

    @PutMapping("/reminders/{idReminder}")
    public ResponseEntity<?> updateReminder(
            @PathVariable Long idReminder,
            @RequestBody Reminder reminder
    ) {
        reminder.setIdReminder(idReminder);
        try {
            Reminder updatedReminder = reminderService.updateReminder(reminder);
            return ResponseEntity.ok(reminderMapper.toDTO(updatedReminder));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/reminders/{idReminder}")
    public ResponseEntity<?> deleteReminder(@PathVariable Long idReminder) {
        try {
            reminderService.deleteReminder(idReminder);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/reminders/{idReminder}/confirm")
    public ResponseEntity<?> markAsConfirmed(@PathVariable Long idReminder) {
        try {
            reminderService.markAsConfirmed(idReminder);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/reminders/{idReminder}/delay")
    public ResponseEntity<?> delayReminder(
            @PathVariable Long idReminder,
            @RequestBody Map<String, String> body
    ) {
        try {
            String newDateStr = body.get("newDate");
            String newTimeStr = body.get("newTime");
            LocalDate newDate = LocalDate.parse(newDateStr);
            LocalTime newTime = LocalTime.parse(newTimeStr);
            Reminder reminder = reminderService.delayReminder(idReminder, newDate, newTime);
            return ResponseEntity.ok(reminderMapper.toDTO(reminder));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/adherence/patient/{patientId}")
    public ResponseEntity<?> getAdherenceStats(
            @PathVariable Long patientId,
            @RequestParam(defaultValue = "30") Integer period
    ) {
        try {
            AdherenceStatsDTO stats = adherenceService.calculateAdherenceStats(patientId, period);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/adherence/patient/{patientId}/update")
    public ResponseEntity<?> updateAdherence(@PathVariable Long patientId) {
        try {
            adherenceService.updatePatientAdherenceRate(patientId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
