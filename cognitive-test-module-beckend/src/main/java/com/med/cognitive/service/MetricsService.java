package com.med.cognitive.service;

import com.med.cognitive.dto.*;
import com.med.cognitive.entity.*;
import com.med.cognitive.entity.CognitiveTest.TypeTest;
import com.med.cognitive.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MetricsService {

    private final PatientTestAssignRepository assignRepository;
    private final TestResultRepository testResultRepository;
    private final CognitiveTestRepository cognitiveTestRepository;
    private final AccompagnantRepository accompagnantRepository;
    private final CognitiveScoreHistoryRepository scoreHistoryRepository;

    // ─── AidantMetrics ───────────────────────────────────────────────────────────

    public AidantMetricsDto getMetricsForAidant(Long accompagnantId) {
        List<PatientTestAssign> assignations = assignRepository.findByAccompagnantId(accompagnantId);
        List<TestResult> results = testResultRepository.findAll().stream()
                .filter(r -> assignations.stream().anyMatch(a -> a.getPatientId().equals(r.getPatientId())))
                .collect(Collectors.toList());

        long totalAssigned  = assignations.size();
        long totalCompleted = assignations.stream()
                .filter(a -> a.getStatus() == AssignStatus.COMPLETED).count();
        long successful = results.stream()
                .filter(r -> r.getScoreTotale() != null && r.getScoreTotale() > 0).count();
        double successRate = totalCompleted > 0 ? (double) successful / totalCompleted * 100 : 0.0;

        Map<String, Double> avgScoreByType = new HashMap<>();
        for (TestResult r : results) {
            if (r.getScoreTotale() == null || r.getTest() == null || r.getTest().getType() == null) continue;
            avgScoreByType.merge(r.getTest().getType().name(),
                    (double) r.getScoreTotale(), (old, val) -> (old + val) / 2);
        }

        Map<String, Long> monthlyCounts = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        for (int i = 5; i >= 0; i--) {
            LocalDate m = today.minusMonths(i);
            String key = m.getYear() + "-" + String.format("%02d", m.getMonthValue());
            long count = assignations.stream()
                    .filter(a -> a.getStatus() == AssignStatus.COMPLETED
                            && a.getDateAssignation() != null
                            && a.getDateAssignation().getYear() == m.getYear()
                            && a.getDateAssignation().getMonthValue() == m.getMonthValue())
                    .count();
            monthlyCounts.put(key, count);
        }
        return new AidantMetricsDto(totalAssigned, totalCompleted, successRate, avgScoreByType, monthlyCounts);
    }

    // ─── Score Global Composite ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ScoreGlobalDTO calculateGlobalScoreForAidant(Long aidantId) {
        Accompagnant accompagnant = accompagnantRepository.findById(aidantId)
                .orElseThrow(() -> new RuntimeException("Aidant non trouvé : " + aidantId));
        Patient patient = accompagnant.getPatient();
        if (patient == null) return buildNonEvaluable(null, null);
        String patientName = patient.getPrenom() + " " + patient.getNom();
        return calculateGlobalScoreForPatient(String.valueOf(patient.getId()), patient.getId(), patientName);
    }

    public ScoreGlobalDTO calculateGlobalScoreForPatient(String patientIdStr, Long patientId, String patientName) {
        List<TestResult> results = testResultRepository.findValidResultsWithTestByPatientId(patientIdStr);
        if (results.isEmpty()) return buildNonEvaluable(patientId, patientName);

        Map<TypeTest, Double> weights = buildWeightMap();
        Map<TypeTest, List<Double>> zByType = new LinkedHashMap<>();
        for (TestResult r : results) {
            TypeTest type = r.getTest().getType();
            double z;
            if (r.getZScore() != null) {
                z = r.getZScore();
            } else {
                double pct = r.getScorePercentage() != null
                        ? r.getScorePercentage()
                        : (r.getScoreTotale().doubleValue() / r.getTest().getTotalScore()) * 100.0;
                z = (pct - 70.0) / 15.0;
            }
            zByType.computeIfAbsent(type, k -> new ArrayList<>()).add(z);
        }

        double weightedSum = 0, totalWeight = 0;
        Map<String, Double> scoreByType = new LinkedHashMap<>();
        for (Map.Entry<TypeTest, List<Double>> entry : zByType.entrySet()) {
            double avgZ  = entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0);
            double weight = weights.getOrDefault(entry.getKey(), 1.0);
            weightedSum  += weight * avgZ;
            totalWeight  += weight;
            scoreByType.put(entry.getKey().name(), Math.round(avgZ * 100.0) / 100.0);
        }
        if (totalWeight == 0) return buildNonEvaluable(patientId, patientName);

        double globalScore = Math.round((weightedSum / totalWeight) * 100.0) / 100.0;
        String colorCode   = globalScore > -1 ? "VERT" : globalScore > -2 ? "JAUNE" : "ROUGE";
        return new ScoreGlobalDTO(globalScore, "OK", colorCode, buildInterpretation(globalScore),
                results.size(), scoreByType, patientId, patientName);
    }

    // ─── Feature 2 : Dashboard summary ───────────────────────────────────────────

    @Transactional(readOnly = true)
    public DashboardSummaryDTO getDashboardSummary(Long soignantId) {
        List<PatientTestAssign> allAssigns = assignRepository.findBySoignantId(soignantId);
        Set<Long> patientIds = allAssigns.stream().map(PatientTestAssign::getPatientId).collect(Collectors.toSet());
        LocalDate today = LocalDate.now();

        int rouge = 0, jaune = 0, vert = 0;
        List<DashboardSummaryDTO.PatientAlerteSummary> urgents = new ArrayList<>();

        for (Long pid : patientIds) {
            List<TestResult> res = testResultRepository.findValidResultsWithTestByPatientId(pid.toString());
            if (res.isEmpty()) continue;
            double avgZ = res.stream().filter(r -> r.getZScore() != null)
                    .mapToDouble(TestResult::getZScore).average().orElse(Double.MAX_VALUE);
            if (avgZ == Double.MAX_VALUE) continue;
            avgZ = Math.round(avgZ * 100.0) / 100.0;
            if (avgZ > -1)      { vert++; }
            else if (avgZ > -2) { jaune++; }
            else {
                rouge++;
                urgents.add(new DashboardSummaryDTO.PatientAlerteSummary(
                        pid, "Patient #" + pid, avgZ, "ROUGE", "DEGRADATION"));
            }
        }

        int retard = (int) allAssigns.stream()
                .filter(a -> a.getStatus() == AssignStatus.ASSIGNED
                        && a.getDateLimite() != null && a.getDateLimite().isBefore(today))
                .count();

        int completedThisWeek = (int) allAssigns.stream()
                .filter(a -> a.getStatus() == AssignStatus.COMPLETED
                        && a.getDateAssignation() != null
                        && a.getDateAssignation().isAfter(LocalDateTime.now().minusDays(7)))
                .count();

        int total = allAssigns.size();
        long completedTotal = allAssigns.stream().filter(a -> a.getStatus() == AssignStatus.COMPLETED).count();
        double taux = total > 0 ? (double) completedTotal / total * 100 : 0;

        Map<String, Long> testsParMois = new LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate m = today.minusMonths(i);
            String key = m.getYear() + "-" + String.format("%02d", m.getMonthValue());
            testsParMois.put(key, allAssigns.stream()
                    .filter(a -> a.getStatus() == AssignStatus.COMPLETED
                            && a.getDateAssignation() != null
                            && a.getDateAssignation().getYear() == m.getYear()
                            && a.getDateAssignation().getMonthValue() == m.getMonthValue())
                    .count());
        }

        urgents.sort(Comparator.comparingDouble(DashboardSummaryDTO.PatientAlerteSummary::getZGlobal));
        return new DashboardSummaryDTO(rouge, jaune, vert, retard, completedThisWeek,
                total, taux, testsParMois,
                urgents.size() > 3 ? urgents.subList(0, 3) : urgents);
    }

    // ─── Feature 4 : Historique de progression ────────────────────────────────────

    @Transactional(readOnly = true)
    public List<HistoriquePointDTO> getHistoriquePatient(String patientId, int mois) {
        LocalDateTime from = LocalDateTime.now().minusMonths(mois);
        return testResultRepository.findAll().stream()
                .filter(r -> patientId.equals(r.getPatientId()))
                .filter(r -> r.getZScore() != null)
                .filter(r -> r.getTestDate() != null && r.getTestDate().isAfter(from))
                .sorted(Comparator.comparing(TestResult::getTestDate))
                .map(r -> {
                    String color = r.getZScore() > -1 ? "VERT" : r.getZScore() > -2 ? "JAUNE" : "ROUGE";
                    String type  = r.getTest() != null && r.getTest().getType() != null
                            ? r.getTest().getType().name() : "INCONNU";
                    return new HistoriquePointDTO(r.getTestDate(), r.getZScore(),
                            r.getScorePercentage(), type,
                            r.getTest() != null ? r.getTest().getTitre() : "", color);
                })
                .collect(Collectors.toList());
    }

    // ─── Feature 8 : Cohorte ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PatientScoreResumeDTO> getCohorteSummary(Long soignantId) {
        Set<Long> patientIds = assignRepository.findBySoignantId(soignantId).stream()
                .map(PatientTestAssign::getPatientId).collect(Collectors.toSet());

        List<PatientScoreResumeDTO> result = new ArrayList<>();
        for (Long pid : patientIds) {
            List<TestResult> res = testResultRepository.findAll().stream()
                    .filter(r -> pid.toString().equals(r.getPatientId()))
                    .filter(r -> r.getZScore() != null)
                    .sorted(Comparator.comparing(TestResult::getTestDate,
                            Comparator.nullsLast(Comparator.reverseOrder())))
                    .collect(Collectors.toList());

            if (res.isEmpty()) {
                result.add(new PatientScoreResumeDTO(pid, "Patient", "#" + pid,
                        null, "GRIS", "INCONNU", 0, null, "Non évaluable"));
                continue;
            }

            double avgZ = res.stream().mapToDouble(TestResult::getZScore).average().orElse(0);
            avgZ = Math.round(avgZ * 100.0) / 100.0;
            String color = avgZ > -1 ? "VERT" : avgZ > -2 ? "JAUNE" : "ROUGE";

            String tendance = "STABLE";
            if (res.size() >= 4) {
                int mid = res.size() / 2;
                double recent = res.subList(0, mid).stream().mapToDouble(TestResult::getZScore).average().orElse(0);
                double older  = res.subList(mid, res.size()).stream().mapToDouble(TestResult::getZScore).average().orElse(0);
                double delta  = recent - older;
                if      (delta >  0.3) tendance = "AMELIORATION";
                else if (delta < -0.3) tendance = "DEGRADATION";
            }

            result.add(new PatientScoreResumeDTO(
                    pid, "Patient", "#" + pid, avgZ, color, tendance,
                    res.size(), res.get(0).getTestDate(), buildInterpretation(avgZ)));
        }
        result.sort(Comparator.comparingDouble(p -> p.getZGlobal() == null ? Double.MAX_VALUE : p.getZGlobal()));
        return result;
    }

    // ─── Recalcul migration ───────────────────────────────────────────────────────

    @Transactional
    public int recalculateZScoresForAllResults() {
        int count = 0;
        for (TestResult r : testResultRepository.findAll()) {
            if (r.getTest() == null || r.getTest().getTotalScore() == null
                    || r.getTest().getTotalScore() <= 0 || r.getScoreTotale() == null) continue;
            double pct = (r.getScoreTotale().doubleValue() / r.getTest().getTotalScore()) * 100.0;
            r.setScorePercentage(pct);
            r.setZScore((pct - 70.0) / 15.0);
            testResultRepository.save(r);
            count++;
        }
        return count;
    }

    public double getLatestMMSEScoreForPatient(String patientId) {
        return testResultRepository.findAll().stream()
                .filter(r -> patientId.equals(r.getPatientId()) && r.getScoreTotale() != null)
                .sorted((a, b) -> b.getTestDate().compareTo(a.getTestDate()))
                .mapToDouble(r -> r.getScoreTotale().doubleValue()).findFirst().orElse(0.0);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private Map<TypeTest, Double> buildWeightMap() {
        Map<TypeTest, Double> w = new EnumMap<>(TypeTest.class);
        w.put(TypeTest.MEMORY,       3.0);
        w.put(TypeTest.LANGUAGE,     2.0);
        w.put(TypeTest.REFLECTION,   2.0);
        w.put(TypeTest.LOGIC,        2.0);
        w.put(TypeTest.AUDIO,        1.5);
        w.put(TypeTest.ATTENTION,    1.5);
        w.put(TypeTest.DRAWING,      1.0);
        w.put(TypeTest.PERSONNALISE, 2.5);
        return w;
    }

    private String buildInterpretation(double score) {
        if (score > -1)  return "Fonctionnement cognitif dans la norme";
        if (score > -2)  return "Légère atteinte cognitive — surveillance recommandée";
        return "Atteinte cognitive significative — consultation nécessaire";
    }

    private ScoreGlobalDTO buildNonEvaluable(Long patientId, String patientName) {
        return new ScoreGlobalDTO(null, "NON_EVALUABLE", null,
                "Non évaluable — aucun test valide", 0, Collections.emptyMap(), patientId, patientName);
    }
}
