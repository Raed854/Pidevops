package MemorIA.entity.diagnostic;

import MemorIA.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"questions", "diagnostics", "notifications", "password"})
    private User user;

    @ManyToOne
    @JoinColumn(name = "rapport_id")
    @JsonIgnoreProperties({"notifications", "diagnostic"})
    private Rapport rapport;

    @ManyToOne
    @JoinColumn(name = "diagnostic_id")
    @JsonIgnoreProperties({"notifications", "patientAnswers", "rapport", "user"})
    private Diagnostic diagnostic;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isRead == null) {
            isRead = false;
        }
    }
}
