package MemorIA.service;

import MemorIA.entity.Traitements.AlertPatient;
import MemorIA.entity.Traitements.TraitementAffectation;
import MemorIA.entity.Traitements.Traitements;
import MemorIA.entity.Traitements.ZoneAutorisee;
import MemorIA.entity.User;
import MemorIA.repository.AlertPatientRepository;
import MemorIA.repository.AuthorizedZoneRepository;
import MemorIA.repository.TraitementAffectationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GeofenceService {

    @Autowired
    private AuthorizedZoneRepository zoneRepository;

    @Autowired
    private TraitementAffectationRepository affectationRepository;

    @Autowired
    private AlertPatientRepository alertPatientRepository;

    @Autowired
    private TwilioService twilioService;

    @Autowired
    private NotificationService notificationService;

    @Value("${twilio.phone-number}")
    private String emergencyPhoneNumber;

    // Anti-spam: clé = traitementId, valeur = timestamp dernière alerte
    private final ConcurrentHashMap<Long, LocalDateTime> lastAlertSent = new ConcurrentHashMap<>();
    private static final int ALERT_COOLDOWN_MINUTES = 5;

    /**
     * Vérifie si la position (lat, lon) est en dehors des zones autorisées du traitement.
     * Si oui → enregistre une alerte en table alert_patient + SMS accompagnant + notification WebSocket.
     *
     * Flow: HistoriquePosition → Traitements → ZoneAutorisee (check)
     *       Traitements → TraitementAffectation → User (accompagnant + patient)
     */
    public void checkGeofence(double lat, double lon, Traitements traitement) {
        if (traitement == null) return;

        Long traitementId = traitement.getIdTraitement();

        // 1. Récupérer les zones actives de ce traitement
        List<ZoneAutorisee> zones = zoneRepository.findByTraitementsIdTraitementAndActifTrue(traitementId);
        if (zones.isEmpty()) {
            System.out.println("[GeofenceService] Aucune zone autorisée pour traitement " + traitementId);
            return;
        }

        // 2. Vérifier si la position est dans au moins une zone
        boolean insideAnyZone = false;
        for (ZoneAutorisee zone : zones) {
            double distance = haversine(lat, lon, zone.getLatitude(), zone.getLongitude());
            if (distance <= zone.getRayon()) {
                insideAnyZone = true;
                break;
            }
        }

        if (insideAnyZone) {
            System.out.println("[GeofenceService] ✓ Patient à l'intérieur d'une zone autorisée");
            return; // dans la zone → OK
        }

        System.out.println("[GeofenceService] ⚠️  PATIENT HORS ZONE DÉTECTÉ!");

        // 3. HORS ZONE → vérifier le cooldown anti-spam (évite les SMS en cascade)
        LocalDateTime lastAlert = lastAlertSent.get(traitementId);
        if (lastAlert != null && lastAlert.plusMinutes(ALERT_COOLDOWN_MINUTES).isAfter(LocalDateTime.now())) {
            System.out.println("[GeofenceService] Alerte en cooldown (dernière alerte il y a < 5 min)");
            return;
        }

        // 4. Trouver le patient et l'accompagnant via traitement_affectation
        List<TraitementAffectation> affectations = affectationRepository.findByTraitementsIdTraitement(traitementId);

        User patient = null;
        User accompagnant = null;
        for (TraitementAffectation aff : affectations) {
            if (aff.getPatientUser() != null) {
                patient = aff.getPatientUser();
                accompagnant = aff.getAccompagnantUser();
                break;
            }
        }

        String patientName = (patient != null)
                ? patient.getPrenom() + " " + patient.getNom()
                : "Patient Inconnu";

        String accompanantName = (accompagnant != null)
                ? accompagnant.getPrenom() + " " + accompagnant.getNom()
                : "Responsable";

        // Formater la date/heure
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        String coordinates = String.format("%.6f°N, %.6f°E", lat, lon);

        // Message d'alerte complet
        String alertMessage = "🚨 ALERTE MEMORIA - PATIENT HORS ZONE 🚨\n\n"
                + "Patient: " + patientName + "\n"
                + "Heure: " + timestamp + "\n"
                + "Position: " + coordinates + "\n"
                + "État: CRITIQUE - Dépassement de zone de sécurité!\n"
                + "Action: Intervention immédiate requise.\n"
                + "Signalé par: MemorIA";

        // 5. TOUJOURS enregistrer l'alerte en base
        AlertPatient alert = new AlertPatient();
        alert.setAlert(alertMessage);
        alert.setTraitements(traitement);
        alertPatientRepository.save(alert);

        System.out.println("[GeofenceService] ✓ ALERTE enregistrée en DB (ID: " + alert.getIdAlerte() + ")");

        // 6. Mettre à jour le cooldown
        lastAlertSent.put(traitementId, LocalDateTime.now());

        // 7. Déterminer le numéro de destination
        String phoneNumber = null;
        if (accompagnant != null && isValidPhoneNumber(accompagnant.getTelephone())) {
            phoneNumber = accompagnant.getTelephone();
            System.out.println("[GeofenceService] SMS destiné à: " + accompanantName + " (" + phoneNumber + ")");
        } else {
            phoneNumber = emergencyPhoneNumber;
            System.out.println("[GeofenceService] ⚠️  Accompagnant introuvable - SMS au numéro d'urgence: " + phoneNumber);
        }

        // 8. Envoyer SMS via Twilio
        try {
            twilioService.sendSms(phoneNumber, alertMessage);
            System.out.println("[GeofenceService] ✓ SMS envoyé avec succès à: " + phoneNumber);
        } catch (Exception e) {
            System.err.println("[GeofenceService] ❌ Erreur lors de l'envoi SMS: " + e.getMessage());
        }

        // 9. Envoyer appel vocal
        try {
            twilioService.makeCall(phoneNumber, patientName);
            System.out.println("[GeofenceService] ✓ Appel vocal lancé vers: " + phoneNumber);
        } catch (Exception e) {
            System.err.println("[GeofenceService] ❌ Erreur lors de l'appel: " + e.getMessage());
        }

        // 10. Envoyer notification WebSocket en temps réel
        if (notificationService != null) {
            notificationService.sendRealTimeAlert(alert, phoneNumber, accompanantName);
            System.out.println("[GeofenceService] ✓ Notification WebSocket envoyée");
        }

        System.out.println("[GeofenceService] ✓ Processus d'alerte terminé avec succès");
    }

    /**
     * Valider format numéro téléphone
     */
    private boolean isValidPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return false;
        }
        // Format: +XXXxxxxxxxxxx (au minimum + suivi de 10 chiffres)
        return phoneNumber.matches("^\\+?[1-9]\\d{8,14}$");
    }

    /**
     * Calcul de distance Haversine (en mètres)
     */
    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000; // Rayon de la Terre en mètres
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(dist * 10.0) / 10.0;
    }
}
