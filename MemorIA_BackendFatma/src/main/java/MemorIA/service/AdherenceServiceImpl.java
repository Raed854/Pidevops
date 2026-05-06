package MemorIA.service;

import MemorIA.entity.Patient;
import MemorIA.entity.Planning.Reminder;
import MemorIA.entity.Planning.ReminderStatus;
import MemorIA.entity.Planning.ReminderType;
import MemorIA.dto.AdherenceStatsDTO;
import MemorIA.dto.CategoryStatsDTO;
import MemorIA.dto.TimelinePointDTO;
import MemorIA.dto.ReminderDTO;
import MemorIA.repository.ReminderRepository;
import MemorIA.repository.PatientRepository;
import MemorIA.mapper.ReminderMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@Slf4j
@RequiredArgsConstructor
public class AdherenceServiceImpl implements IAdherenceService {

    private final ReminderRepository reminderRepository;
    private final PatientRepository patientRepository;
    private final ReminderMapper reminderMapper;

    @Override
    public AdherenceStatsDTO calculateAdherenceStats(Long patientId, Integer period) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(period != null ? period : 30);

        List<Reminder> reminders;
        try {
            reminders = reminderRepository.findByPatientIdAndReminderDateBetween(patientId, startDate, endDate);
        } catch (Exception e) {
            log.error("[AdherenceService] Erreur lecture reminders patient {}: {}", patientId, e.getMessage());
            reminders = new ArrayList<>();
        }
        if (reminders == null) reminders = new ArrayList<>();

        // ...existing code...
        final List<Reminder> safeReminders = reminders.stream()
                .filter(r -> r != null && r.getReminderDate() != null)
                .collect(Collectors.toList());

        AdherenceStatsDTO stats = new AdherenceStatsDTO();
        stats.setPatientId(patientId);
        stats.setPeriod(period != null ? period : 30);

        long total = safeReminders.size();
        long completed = safeReminders.stream()
                .filter(r -> r.getStatus() != null &&
                        (r.getStatus() == ReminderStatus.CONFIRMED ||
                         r.getStatus() == ReminderStatus.CONFIRMED_LATE))
                .count();
        long missed = safeReminders.stream()
                .filter(r -> r.getStatus() == ReminderStatus.MISSED)
                .count();
        long delayed = safeReminders.stream()
                .filter(r -> r.getStatus() == ReminderStatus.RESCHEDULED)
                .count();

        double overallRate = total > 0 ? Math.round(completed * 100.0 / total * 10) / 10.0 : 0.0;
        stats.setOverallRate(overallRate);

        stats.setTotalReminders((int) total);
        stats.setConfirmedCount((int) completed);
        stats.setMissedCount((int) missed);
        stats.setDelayedCount((int) delayed);

        // Médicaments
        List<Reminder> medReminders = safeReminders.stream()
                .filter(r -> r.getType() == ReminderType.MEDICATION ||
                             r.getType() == ReminderType.MEDICATION_VITAL)
                .collect(Collectors.toList());
        long medTotal = medReminders.size();
        long medDone = medReminders.stream()
                .filter(r -> r.getStatus() == ReminderStatus.CONFIRMED ||
                             r.getStatus() == ReminderStatus.CONFIRMED_LATE)
                .count();
        double medRate = medTotal > 0 ? Math.round(medDone * 100.0 / medTotal) : 0.0;
        stats.setMedicationAdherence(medRate);

        // Activités
        List<Reminder> actReminders = safeReminders.stream()
                .filter(r -> r.getType() != ReminderType.MEDICATION &&
                             r.getType() != ReminderType.MEDICATION_VITAL)
                .collect(Collectors.toList());
        long actTotal = actReminders.size();
        long actDone = actReminders.stream()
                .filter(r -> r.getStatus() == ReminderStatus.CONFIRMED ||
                             r.getStatus() == ReminderStatus.CONFIRMED_LATE)
                .count();
        double actRate = actTotal > 0 ? Math.round(actDone * 100.0 / actTotal) : 0.0;
        stats.setActivityAdherence(actRate);

        // Tendance oublis sur 7j
        List<AdherenceStatsDTO.ForgetfulnessEntry> trend = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = endDate.minusDays(i);
            long dayMissed = safeReminders.stream()
                    .filter(r -> r.getReminderDate().equals(day) &&
                                 r.getStatus() == ReminderStatus.MISSED)
                    .count();
            trend.add(new AdherenceStatsDTO.ForgetfulnessEntry(day.toString(), (int) dayMissed));
        }
        stats.setForgetfulnessTrend(trend);

        stats.setByCategory(calculateByCategory(safeReminders));
        stats.setTimeline(calculateTimeline(safeReminders, 7));

        List<ReminderDTO> recentMissed = safeReminders.stream()
                .filter(r -> r.getStatus() == ReminderStatus.MISSED)
                .sorted((a, b) -> b.getReminderDate().compareTo(a.getReminderDate()))
                .limit(5)
                .map(r -> {
                    try { return reminderMapper.toDTO(r); }
                    catch (Exception e) { return null; }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        stats.setRecentMissed(recentMissed);

        return stats;
    }

    @Override
    @Transactional
    public void updatePatientAdherenceRate(Long patientId) {
        try {
            AdherenceStatsDTO stats = calculateAdherenceStats(patientId, 30);
            patientRepository.findById(patientId).ifPresent(patient -> {
                patient.setAdherenceRate(stats.getOverallRate());
                patientRepository.save(patient);
            });
        } catch (Exception e) {
            log.error("[AdherenceService] Could not update adherence rate for patient {}: {}", patientId, e.getMessage());
        }
    }

    private Map<String, CategoryStatsDTO> calculateByCategory(List<Reminder> reminders) {
        Map<String, CategoryStatsDTO> categoryMap = new HashMap<>();

        Map<ReminderType, List<Reminder>> groupedByType = reminders.stream()
                .filter(r -> r.getType() != null)
                .collect(Collectors.groupingBy(Reminder::getType));

        for (Map.Entry<ReminderType, List<Reminder>> entry : groupedByType.entrySet()) {
            ReminderType type = entry.getKey();
            List<Reminder> typeReminders = entry.getValue();

            CategoryStatsDTO categoryStats = new CategoryStatsDTO();
            categoryStats.setType(type.name());
            categoryStats.setTotal(typeReminders.size());

            long completedCount = typeReminders.stream()
                    .filter(r -> r.getStatus() == ReminderStatus.CONFIRMED ||
                            r.getStatus() == ReminderStatus.CONFIRMED_LATE)
                    .count();

            categoryStats.setCompleted((int) completedCount);
            categoryStats.setRate(
                    typeReminders.size() > 0 ? (completedCount * 100.0 / typeReminders.size()) : 0.0
            );

            categoryMap.put(type.name(), categoryStats);
        }

        return categoryMap;
    }

    private List<TimelinePointDTO> calculateTimeline(List<Reminder> reminders, int days) {
        List<TimelinePointDTO> timeline = new ArrayList<>();
        LocalDate endDate = LocalDate.now();

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = endDate.minusDays(i);

            List<Reminder> dayReminders = reminders.stream()
                    .filter(r -> r.getReminderDate() != null && r.getReminderDate().equals(date))
                    .collect(Collectors.toList());

            TimelinePointDTO point = new TimelinePointDTO();
            point.setDate(date);

            if (dayReminders.isEmpty()) {
                point.setRate(0.0);
            } else {
                long completed = dayReminders.stream()
                        .filter(r -> r.getStatus() == ReminderStatus.CONFIRMED ||
                                r.getStatus() == ReminderStatus.CONFIRMED_LATE)
                        .count();
                point.setRate(completed * 100.0 / dayReminders.size());
            }

            timeline.add(point);
        }

        return timeline;
    }
}