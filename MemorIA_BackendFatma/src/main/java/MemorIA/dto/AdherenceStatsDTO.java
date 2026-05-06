package MemorIA.dto;

import java.util.List;
import java.util.Map;

public class AdherenceStatsDTO {

    private Double medicationAdherence;
    private Double activityAdherence;
    private Integer totalReminders;
    private Integer confirmedCount;
    private Integer missedCount;
    private Integer delayedCount;
    private List<ForgetfulnessEntry> forgetfulnessTrend;

    private Long patientId;
    private Long confirmed;
    private Long pending;
    private Long rescheduled;
    private Double adherenceRate;
    private Integer periodDays;

    private Integer period;
    private Double overallRate;
    private Map<String, CategoryStatsDTO> byCategory;
    private List<TimelinePointDTO> timeline;
    private List<ReminderDTO> recentMissed;

    // ===== Getters & Setters =====

    public Double getMedicationAdherence() { return medicationAdherence; }
    public void setMedicationAdherence(Double v) { this.medicationAdherence = v; }

    public Double getActivityAdherence() { return activityAdherence; }
    public void setActivityAdherence(Double v) { this.activityAdherence = v; }

    public Integer getTotalReminders() { return totalReminders; }
    public void setTotalReminders(Integer v) { this.totalReminders = v; }

    public Integer getConfirmedCount() { return confirmedCount; }
    public void setConfirmedCount(Integer v) { this.confirmedCount = v; }

    public Integer getMissedCount() { return missedCount; }
    public void setMissedCount(Integer v) { this.missedCount = v; }

    public Integer getDelayedCount() { return delayedCount; }
    public void setDelayedCount(Integer v) { this.delayedCount = v; }

    public List<ForgetfulnessEntry> getForgetfulnessTrend() { return forgetfulnessTrend; }
    public void setForgetfulnessTrend(List<ForgetfulnessEntry> v) { this.forgetfulnessTrend = v; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long v) { this.patientId = v; }

    public Long getConfirmed() { return confirmed; }
    public void setConfirmed(Long v) { this.confirmed = v; }

    public Long getPending() { return pending; }
    public void setPending(Long v) { this.pending = v; }

    public Long getRescheduled() { return rescheduled; }
    public void setRescheduled(Long v) { this.rescheduled = v; }

    public Double getAdherenceRate() { return adherenceRate; }
    public void setAdherenceRate(Double v) { this.adherenceRate = v; }

    public Integer getPeriodDays() { return periodDays; }
    public void setPeriodDays(Integer v) { this.periodDays = v; }

    public Integer getPeriod() { return period; }
    public void setPeriod(Integer v) { this.period = v; }

    public Double getOverallRate() { return overallRate; }
    public void setOverallRate(Double v) { this.overallRate = v; }


    public Map<String, CategoryStatsDTO> getByCategory() { return byCategory; }
    public void setByCategory(Map<String, CategoryStatsDTO> v) { this.byCategory = v; }

    public List<TimelinePointDTO> getTimeline() { return timeline; }
    public void setTimeline(List<TimelinePointDTO> v) { this.timeline = v; }

    public List<ReminderDTO> getRecentMissed() { return recentMissed; }
    public void setRecentMissed(List<ReminderDTO> v) { this.recentMissed = v; }


    // ===== Inner Classes =====

    public static class ForgetfulnessEntry {
        private String date;
        private Integer count;

        public ForgetfulnessEntry() {}

        public ForgetfulnessEntry(String date, Integer count) {
            this.date = date;
            this.count = count;
        }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public Integer getCount() { return count; }
        public void setCount(Integer count) { this.count = count; }
    }
}