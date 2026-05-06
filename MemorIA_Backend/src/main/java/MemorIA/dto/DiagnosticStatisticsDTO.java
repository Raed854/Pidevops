package MemorIA.dto;

import java.util.List;
import java.util.Map;

public class DiagnosticStatisticsDTO {

    private int    totalDiagnostics;
    private double averageScore;
    private double highestScore;
    private double lastScore;

    /** Number of diagnostics per risk level: LOW, MEDIUM, HIGH, CRITICAL */
    private Map<String, Long>   countByRiskLevel;

    /** Percentage of diagnostics per risk level (0–100) */
    private Map<String, Double> percentageByRiskLevel;

    private List<DiagnosticSummary> diagnostics;

    public DiagnosticStatisticsDTO() {}

    public int getTotalDiagnostics() { return totalDiagnostics; }
    public void setTotalDiagnostics(int totalDiagnostics) { this.totalDiagnostics = totalDiagnostics; }

    public double getAverageScore() { return averageScore; }
    public void setAverageScore(double averageScore) { this.averageScore = averageScore; }

    public double getHighestScore() { return highestScore; }
    public void setHighestScore(double highestScore) { this.highestScore = highestScore; }

    public double getLastScore() { return lastScore; }
    public void setLastScore(double lastScore) { this.lastScore = lastScore; }

    public Map<String, Long> getCountByRiskLevel() { return countByRiskLevel; }
    public void setCountByRiskLevel(Map<String, Long> countByRiskLevel) { this.countByRiskLevel = countByRiskLevel; }

    public Map<String, Double> getPercentageByRiskLevel() { return percentageByRiskLevel; }
    public void setPercentageByRiskLevel(Map<String, Double> percentageByRiskLevel) { this.percentageByRiskLevel = percentageByRiskLevel; }

    public List<DiagnosticSummary> getDiagnostics() { return diagnostics; }
    public void setDiagnostics(List<DiagnosticSummary> diagnostics) { this.diagnostics = diagnostics; }

    // ------- Inner DTO for chart data -------
    public static class DiagnosticSummary {
        private Long idDiagnostic;
        private String titre;
        private String dateDiagnostic;
        private Double aiScore;
        private String riskLevel;
        private Double pourcentageAlzeimer;
        private String patientName;

        public DiagnosticSummary() {}

        public Long getIdDiagnostic() { return idDiagnostic; }
        public void setIdDiagnostic(Long idDiagnostic) { this.idDiagnostic = idDiagnostic; }

        public String getTitre() { return titre; }
        public void setTitre(String titre) { this.titre = titre; }

        public String getDateDiagnostic() { return dateDiagnostic; }
        public void setDateDiagnostic(String dateDiagnostic) { this.dateDiagnostic = dateDiagnostic; }

        public Double getAiScore() { return aiScore; }
        public void setAiScore(Double aiScore) { this.aiScore = aiScore; }

        public String getRiskLevel() { return riskLevel; }
        public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

        public Double getPourcentageAlzeimer() { return pourcentageAlzeimer; }
        public void setPourcentageAlzeimer(Double pourcentageAlzeimer) { this.pourcentageAlzeimer = pourcentageAlzeimer; }

        public String getPatientName() { return patientName; }
        public void setPatientName(String patientName) { this.patientName = patientName; }
    }
}
