package MemorIA.entity.Planning;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Workflow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idWorkflow;

    @OneToOne
    @JoinColumn(name = "reminder_id", nullable = false)
    @JsonBackReference
    private Reminder reminder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private StepType currentStep;

    @Column(nullable = false)
    private Integer maxDelayMinutes;

    // Getters et Setters

    public Long getIdWorkflow() {
        return idWorkflow;
    }

    public void setIdWorkflow(Long idWorkflow) {
        this.idWorkflow = idWorkflow;
    }

    public Reminder getReminder() {
        return reminder;
    }

    public void setReminder(Reminder reminder) {
        this.reminder = reminder;
    }

    public StepType getCurrentStep() {
        return currentStep;
    }

    public void setCurrentStep(StepType currentStep) {
        this.currentStep = currentStep;
    }

    public Integer getMaxDelayMinutes() {
        return maxDelayMinutes;
    }

    public void setMaxDelayMinutes(Integer maxDelayMinutes) {
        this.maxDelayMinutes = maxDelayMinutes;
    }
}
