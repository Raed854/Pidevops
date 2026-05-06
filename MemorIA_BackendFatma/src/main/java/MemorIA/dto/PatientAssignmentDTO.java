package MemorIA.dto;

import jakarta.validation.constraints.NotNull;

public class PatientAssignmentDTO {

    public Long id;

    @NotNull
    public Long patientId;

    public String patientName;
    public String patientPrenom;

    @NotNull
    public Long caregiverId;

    public String status; // "accepted", "pending", "rejected"

    public Boolean isPrimary;

    public String assignedDate;

    // Constructors
    public PatientAssignmentDTO() {}

    public PatientAssignmentDTO(Long id, Long patientId, String patientName, String patientPrenom,
                                Long caregiverId, String status, Boolean isPrimary, String assignedDate) {
        this.id = id;
        this.patientId = patientId;
        this.patientName = patientName;
        this.patientPrenom = patientPrenom;
        this.caregiverId = caregiverId;
        this.status = status;
        this.isPrimary = isPrimary;
        this.assignedDate = assignedDate;
    }

    // Getters & Setters
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
}
