package MemorIA.entity.alerts;

import MemorIA.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "alert_recipients",
        uniqueConstraints = @UniqueConstraint(name = "uk_alert_recipient", columnNames = {"alert_id", "user_id"}),
        indexes = {
                @Index(name = "idx_alert_recipient_user", columnList = "user_id"),
                @Index(name = "idx_alert_recipient_alert", columnList = "alert_id")
        }
)
@Getter
@Setter
public class AlertRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "alert_id", nullable = false)
    private Alert alert;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "recipient_role", nullable = false, length = 20)
    private RecipientRole recipientRole;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum RecipientRole {
        DOCTOR,
        CAREGIVER,
        PATIENT
    }
}

