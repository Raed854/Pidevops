package com.med.cognitive.service;

import com.med.cognitive.entity.AppNotification;
import com.med.cognitive.repository.AppNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final AppNotificationRepository repository;

    // ── Lecture ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AppNotification> getUnread(Long recipientId) {
        return repository.findByRecipientIdAndReadFalseOrderByCreatedAtDesc(recipientId);
    }

    @Transactional(readOnly = true)
    public List<AppNotification> getAll(Long recipientId) {
        return repository.findByRecipientIdOrderByCreatedAtDesc(recipientId);
    }

    @Transactional(readOnly = true)
    public long countUnread(Long recipientId) {
        return repository.countByRecipientIdAndReadFalse(recipientId);
    }

    // ── Marquage ─────────────────────────────────────────────────────────────────

    public AppNotification markRead(Long notifId) {
        AppNotification n = repository.findById(notifId)
                .orElseThrow(() -> new RuntimeException("Notification introuvable : " + notifId));
        n.setRead(true);
        return repository.save(n);
    }

    public void markAllRead(Long recipientId) {
        repository.markAllReadByRecipient(recipientId);
    }

    // ── Création de notifications métier ─────────────────────────────────────────

    public void createScoreAlerte(Long patientId, String patientName, Double zScore, Long soignantId) {
        boolean isCritical = zScore < -2;
        AppNotification n = build(
                soignantId, "SOIGNANT",
                "SCORE_ALERTE",
                (isCritical ? "Alerte critique" : "Surveillance") + " — " + patientName,
                "Score cognitif z = " + String.format("%.2f", zScore)
                        + (isCritical
                        ? ". Consultation spécialiste recommandée."
                        : ". Légère atteinte détectée, surveillance rapprochée conseillée."),
                isCritical ? "CRITICAL" : "WARNING",
                "/patients/" + patientId,
                patientId, patientName, zScore, null
        );
        repository.save(n);
    }

    public void createTestCompleted(Long patientId, String patientName,
                                    String testTitle, Long soignantId) {
        AppNotification n = build(
                soignantId, "SOIGNANT",
                "TEST_COMPLETED",
                "Test complété — " + patientName,
                "Le patient " + patientName + " a terminé le test : « " + testTitle + " ».",
                "INFO",
                "/tests-cognitifs",
                patientId, patientName, null, testTitle
        );
        repository.save(n);
    }

    public void createTestExpired(Long patientId, String patientName,
                                  String testTitle, Long soignantId) {
        AppNotification n = build(
                soignantId, "SOIGNANT",
                "TEST_EXPIRY",
                "Test expiré — " + patientName,
                "Le test « " + testTitle + " » assigné au patient "
                        + patientName + " a dépassé sa date limite sans être démarré.",
                "WARNING",
                "/tests-cognitifs",
                patientId, patientName, null, testTitle
        );
        repository.save(n);
    }

    /**
     * Notifie l'aidant qu'un nouveau test lui a été assigné pour son patient.
     */
    public void createTestAssigned(Long patientId, String patientName,
                                   String testTitle, Long accompagnantId) {
        AppNotification n = build(
                accompagnantId, "AIDANT",
                "TEST_ASSIGNED",
                "Nouveau test assigné — " + patientName,
                "Un test « " + testTitle + " » a été assigné pour le patient "
                        + patientName + ". Veuillez planifier la séance.",
                "INFO",
                "/planning",
                patientId, patientName, null, testTitle
        );
        repository.save(n);
    }

    /**
     * Notifie le soignant qu'un aidant a démarré un test.
     */
    public void createTestStarted(Long patientId, String patientName,
                                  String testTitle, Long soignantId) {
        AppNotification n = build(
                soignantId, "SOIGNANT",
                "TEST_STARTED",
                "Test démarré — " + patientName,
                "L'aidant a démarré le test « " + testTitle + " » avec le patient " + patientName + ".",
                "INFO",
                "/tests-cognitifs",
                patientId, patientName, null, testTitle
        );
        repository.save(n);
    }

    public void createDecisionPending(Long patientId, String patientName, Long soignantId) {
        AppNotification n = build(
                soignantId, "SOIGNANT",
                "DECISION_PENDING",
                "Décision en attente — " + patientName,
                "Une décision clinique nécessite votre approbation pour le patient " + patientName + ".",
                "WARNING",
                "/analyses",
                patientId, patientName, null, null
        );
        repository.save(n);
    }

    // ── Builder interne ───────────────────────────────────────────────────────────

    private AppNotification build(Long recipientId, String role, String type,
                                  String title, String message, String severity,
                                  String actionUrl, Long patientId, String patientName,
                                  Double zScore, String extraData) {
        AppNotification n = new AppNotification();
        n.setRecipientId(recipientId);
        n.setRecipientRole(role);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setSeverity(severity);
        n.setActionUrl(actionUrl);
        n.setPatientId(patientId);
        n.setPatientName(patientName);
        n.setZScore(zScore);
        n.setExtraData(extraData);
        return n;
    }
}
