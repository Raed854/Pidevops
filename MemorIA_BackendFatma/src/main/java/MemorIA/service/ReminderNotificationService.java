package MemorIA.service;

import MemorIA.entity.CaregiverLink;
import MemorIA.entity.Planning.NotificationChannel;
import MemorIA.entity.Planning.Reminder;
import MemorIA.entity.User;
import MemorIA.repository.CaregiverLinkRepository;
import MemorIA.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Service responsable de l'envoi des notifications pour un rappel.
 *
 * Canaux supportés :
 *  - EMAIL      → envoi via JavaMailSender (Gmail SMTP)
 *  - PUSH       → log (WebSocket / FCM à brancher)
 *  - SMS        → log (Twilio / autre à brancher)
 *  - VOICE_CALL → log (Twilio Voice / autre à brancher)
 */
@Service
public class ReminderNotificationService {

    private static final Logger log = LoggerFactory.getLogger(ReminderNotificationService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private SmsService smsService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CaregiverLinkRepository caregiverLinkRepository;

    /**
     * Point d'entrée principal : envoie toutes les notifications configurées
     * pour le rappel donné, vers le patient et/ou le caregiver selon les flags.
     */
    public void sendAllNotifications(Reminder reminder) {
        if (reminder == null || reminder.getPatientId() == null) {
            log.warn("Rappel null ou sans patientId — notification ignorée");
            return;
        }

        Optional<User> patientOpt = userRepository.findById(reminder.getPatientId());
        if (patientOpt.isEmpty()) {
            log.warn("Patient introuvable (id={}) pour le rappel {} — notification ignorée",
                    reminder.getPatientId(), reminder.getIdReminder());
            return;
        }

        Set<NotificationChannel> channels = reminder.getNotificationChannels();
        if (channels == null || channels.isEmpty()) {
            log.info("Aucun canal configuré pour le rappel {} → envoi email par défaut", reminder.getIdReminder());
            channels = Set.of(NotificationChannel.EMAIL);
        }

        if (!Boolean.FALSE.equals(reminder.getNotifyPatient())) {
            dispatchToRecipient(reminder, patientOpt.get(), channels, "patient");
        }

        if (Boolean.TRUE.equals(reminder.getNotifyCaregiver())) {
            List<User> caregivers = resolveCaregiverRecipients(reminder);
            if (caregivers.isEmpty()) {
                log.warn("Aucun caregiver destinataire trouvé pour reminder id={} (caregiverId={})",
                        reminder.getIdReminder(), reminder.getCaregiverId());
            }
            for (User caregiver : caregivers) {
                dispatchToRecipient(reminder, caregiver, channels, "caregiver");
            }
        }
    }

    private void dispatchToRecipient(Reminder reminder, User recipient, Set<NotificationChannel> channels, String targetType) {
        for (NotificationChannel channel : channels) {
            switch (channel) {
                case EMAIL      -> sendEmail(reminder, recipient, targetType);
                case PUSH       -> sendPush(reminder, recipient, targetType);
                case SMS        -> sendSms(reminder, recipient, targetType);
                case VOICE_CALL -> sendVoiceCall(reminder, recipient, targetType);
            }
        }
    }

    /**
     * Résout les caregivers destinataires:
     * 1) caregiverId explicite si lien accepte
     * 2) sinon tous les liens acceptes du patient
     */
    private List<User> resolveCaregiverRecipients(Reminder reminder) {
        LinkedHashMap<Long, User> uniqueRecipients = new LinkedHashMap<>();

        if (reminder.getCaregiverId() != null) {
            caregiverLinkRepository.findByCaregiverIdAndPatientId(reminder.getCaregiverId(), reminder.getPatientId())
                    .filter(link -> "accepted".equalsIgnoreCase(link.getStatus()))
                    .map(CaregiverLink::getCaregiver)
                    .ifPresent(user -> uniqueRecipients.put(user.getId(), user));
        }

        if (uniqueRecipients.isEmpty()) {
            List<CaregiverLink> acceptedLinks = caregiverLinkRepository
                    .findByPatientIdAndStatus(reminder.getPatientId(), "accepted");
            for (CaregiverLink link : acceptedLinks) {
                User caregiver = link.getCaregiver();
                if (caregiver != null && caregiver.getId() != null) {
                    uniqueRecipients.put(caregiver.getId(), caregiver);
                }
            }
        }

        return new ArrayList<>(uniqueRecipients.values());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Envoie un email de rappel via Gmail SMTP (configuré dans application.properties).
     */
    private void sendEmail(Reminder reminder, User recipient, String targetType) {
        try {
            String subject = buildEmailSubject(reminder);
            String body    = buildEmailBody(reminder, recipient);

            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom("jasserchouat3@gmail.com");
            msg.setTo(recipient.getEmail());
            msg.setSubject(subject);
            msg.setText(body);

            mailSender.send(msg);
            log.info("✉️  Email envoyé ({}) à {} pour le rappel '{}' (id={})",
                    targetType, recipient.getEmail(), reminder.getTitle(), reminder.getIdReminder());

        } catch (Exception e) {
            log.error("❌ Échec envoi email ({}) pour rappel {} : {}", targetType, reminder.getIdReminder(), e.getMessage());
        }
    }

    private String buildEmailSubject(Reminder reminder) {
        String type = reminder.getType() != null ? reminder.getType().name() : "RAPPEL";
        return "⏰ MemoriA — Rappel : " + reminder.getTitle()
                + " [" + typeLabel(type) + "]";
    }

    private String buildEmailBody(Reminder reminder, User patient) {
        String heure = reminder.getReminderTime() != null
                ? reminder.getReminderTime().toString().substring(0, 5)
                : "maintenant";
        String type = reminder.getType() != null ? typeLabel(reminder.getType().name()) : "Rappel";

        return "Bonjour " + patient.getPrenom() + " " + patient.getNom() + ",\n\n"
                + "Voici votre rappel MemoriA :\n\n"
                + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                + "  📌 " + reminder.getTitle() + "\n"
                + "  🕐 Heure   : " + heure + "\n"
                + "  📋 Type    : " + type + "\n"
                + (reminder.getDescription() != null ? "  📝 Détails : " + reminder.getDescription() + "\n" : "")
                + (reminder.getNotes() != null        ? "  💊 Instructions : " + reminder.getNotes() + "\n" : "")
                + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                + "Pensez à confirmer ce rappel dans l'application MemoriA.\n\n"
                + "Cordialement,\nL'équipe MemoriA 🧠";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUSH (à brancher avec Firebase FCM ou WebSocket)
    // ─────────────────────────────────────────────────────────────────────────

    private void sendPush(Reminder reminder, User recipient, String targetType) {
        log.info("📱 PUSH ({}) → {} {} | Rappel : '{}' à {}",
                targetType,
                recipient.getPrenom(), recipient.getNom(),
                reminder.getTitle(),
                reminder.getReminderTime() != null ? reminder.getReminderTime() : "maintenant");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SMS (Twilio Integration)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Envoie un SMS de rappel via Twilio
     */
    private void sendSms(Reminder reminder, User recipient, String targetType) {
        try {
            // Vérifier que le numéro de téléphone est présent
            if (recipient.getTelephone() == null || recipient.getTelephone().trim().isEmpty()) {
                log.warn("⚠️  SMS ({}) → {} : pas de numéro de téléphone", targetType, recipient.getPrenom());
                return;
            }

            // Construire le message SMS
            String message = buildSmsMessage(reminder);

            // Envoyer via Twilio
            boolean success = smsService.sendSms(recipient.getTelephone(), message);

            if (success) {
                log.info("📲 SMS envoyé ({}) à {} | Tél: {} | Rappel: '{}'",
                        targetType,
                        recipient.getPrenom() + " " + recipient.getNom(),
                        recipient.getTelephone(),
                        reminder.getTitle());
            } else {
                log.warn("⚠️  Échec envoi SMS ({}) à {} | Tél: {} | Rappel: '{}'",
                        targetType,
                        recipient.getPrenom() + " " + recipient.getNom(),
                        recipient.getTelephone(),
                        reminder.getTitle());
            }

        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi du SMS ({}) pour rappel {}: {}",
                    targetType, reminder.getIdReminder(), e.getMessage(), e);
        }
    }

    /**
     * Construit le contenu du message SMS (limité à 160 caractères pour une SMS classique)
     */
    private String buildSmsMessage(Reminder reminder) {
        String heure = reminder.getReminderTime() != null
                ? reminder.getReminderTime().toString().substring(0, 5)
                : "maintenant";
        String type = reminder.getType() != null ? reminder.getType().name() : "RAPPEL";

        // Format court pour SMS (160 chars max pour une SMS classique)
        String message = String.format("[MemoriA] Rappel: %s à %s (%s)",
                reminder.getTitle(),
                heure,
                typeLabel(type)
        );

        // Ajouter description si elle tient dans les limites SMS
        if (reminder.getDescription() != null && !reminder.getDescription().isEmpty()) {
            String fullMessage = message + " - " + reminder.getDescription();
            if (fullMessage.length() <= 160) {
                message = fullMessage;
            }
        }

        return message;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VOICE CALL (à brancher avec Twilio Voice)
    // ─────────────────────────────────────────────────────────────────────────

    private void sendVoiceCall(Reminder reminder, User recipient, String targetType) {
        log.info("📞 APPEL VOCAL ({}) → {} | Tél: {} | Rappel: '{}'",
                targetType,
                recipient.getPrenom() + " " + recipient.getNom(),
                recipient.getTelephone(),
                reminder.getTitle());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER : libellé français du type
    // ─────────────────────────────────────────────────────────────────────────

    private String typeLabel(String type) {
        return switch (type) {
            case "MEDICATION"          -> "Médicament";
            case "MEDICATION_VITAL"    -> "Médicament vital";
            case "MEAL"                -> "Repas";
            case "PHYSICAL_ACTIVITY"   -> "Activité physique";
            case "HYGIENE"             -> "Hygiène";
            case "MEDICAL_APPOINTMENT" -> "Rendez-vous médical";
            case "VITAL_SIGNS"         -> "Signes vitaux";
            case "COGNITIVE_TEST"      -> "Test cognitif";
            case "FAMILY_CALL"         -> "Appel famille";
            case "WALK"                -> "Promenade";
            case "SLEEP_ROUTINE"       -> "Routine sommeil";
            case "HYDRATION"           -> "Hydratation";
            default                    -> "Rappel";
        };
    }
}

