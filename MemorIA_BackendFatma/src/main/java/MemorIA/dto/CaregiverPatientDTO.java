package MemorIA.dto;

/**
 * DTO retourné par GET /api/caregivers/my-patients
 * Compatible avec PatientAssignment du frontend Angular.
 */
public class CaregiverPatientDTO {

    private Long id;             // id du lien CaregiverLink
    private Long patientId;      // id du patient
    private String patientName;  // nom du patient
    private String patientPrenom;
    private Long caregiverId;
    private String status;       // accepted / pending / rejected
    private Boolean isPrimary;
    private String assignedDate;

    // ── Infos patient enrichies ───────────────────────────────────────
    private Integer age;
    private String photo;
    private String initials;
    private String alzheimerStage; // stade Alzheimer (ex: EARLY, MIDDLE, LATE)
    private Double adherenceRate;  // taux d'observance 0-100

    // ── Constructeur vide ─────────────────────────────────────────────
    public CaregiverPatientDTO() {}

    // ── Getters & Setters ─────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getPatientPrenom() { return patientPrenom; }
    public void setPatientPrenom(String patientPrenom) { this.patientPrenom = patientPrenom; }

    public Long getCaregiverId() { return caregiverId; }
    public void setCaregiverId(Long caregiverId) { this.caregiverId = caregiverId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsPrimary() { return isPrimary; }
    public void setIsPrimary(Boolean isPrimary) { this.isPrimary = isPrimary; }

    public String getAssignedDate() { return assignedDate; }
    public void setAssignedDate(String assignedDate) { this.assignedDate = assignedDate; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getPhoto() { return photo; }
    public void setPhoto(String photo) { this.photo = photo; }

    public String getInitials() { return initials; }
    public void setInitials(String initials) { this.initials = initials; }

    public String getAlzheimerStage() { return alzheimerStage; }
    public void setAlzheimerStage(String alzheimerStage) { this.alzheimerStage = alzheimerStage; }

    public Double getAdherenceRate() { return adherenceRate; }
    public void setAdherenceRate(Double adherenceRate) { this.adherenceRate = adherenceRate; }
}

