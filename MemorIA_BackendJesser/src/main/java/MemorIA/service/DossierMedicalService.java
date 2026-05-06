package MemorIA.service;

import MemorIA.entity.DossierMedical;
import MemorIA.entity.Patient;
import MemorIA.entity.User;
import MemorIA.repository.DossierMedicalRepository;
import MemorIA.repository.PatientRepository;
import MemorIA.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class DossierMedicalService {

    private final DossierMedicalRepository dossierRepo;
    private final PatientRepository patientRepo;
    private final UserRepository userRepo;

    public DossierMedicalService(DossierMedicalRepository dossierRepo,
                                  PatientRepository patientRepo,
                                  UserRepository userRepo) {
        this.dossierRepo = dossierRepo;
        this.patientRepo = patientRepo;
        this.userRepo = userRepo;
    }

    // ─── Admin-only: list all records ────────────────────────────────────────

    public List<DossierMedical> getAll(Long requesterId) {
        requireAdminOrSoignant(requesterId);
        return dossierRepo.findAll();
    }

    // ─── Get by dossier ID (patient, soignant, or admin) ─────────────────────

    public DossierMedical getById(Long dossierId, Long requesterId) {
        DossierMedical dossier = dossierRepo.findById(dossierId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier médical introuvable"));
        requireAccess(dossier, requesterId);
        return dossier;
    }

    // ─── Get by patient ID (patient, soignant, or admin) ─────────────────────

    public DossierMedical getByPatientId(Long patientId, Long requesterId) {
        DossierMedical dossier = dossierRepo.findByPatientId(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Aucun dossier médical trouvé pour ce patient"));
        requireAccess(dossier, requesterId);
        return dossier;
    }

    // ─── Create (soignant, admin, or patient for their own record) ───────────

    @Transactional
    public DossierMedical create(DossierMedical dossier, Long requesterId) {
        if (dossier.getPatient() == null || dossier.getPatient().getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le patient est obligatoire");
        }

        User requester = getActiveUser(requesterId);
        String role = requester.getRole().toUpperCase();
        boolean isAdminOrSoignant = "ADMINISTRATEUR".equals(role) || "SOIGNANT".equals(role);
        boolean isSelfPatient = "PATIENT".equals(role) && requesterId.equals(dossier.getPatient().getId());

        if (!isAdminOrSoignant && !isSelfPatient) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès refusé : vous ne pouvez créer que votre propre dossier médical");
        }

        Long patientId = dossier.getPatient().getId();
        Patient patient = patientRepo.findById(patientId).orElseGet(() -> {
            // Patient profile not yet set up — check if the user exists with PATIENT role
            User patientUser = userRepo.findById(patientId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Patient introuvable : aucun utilisateur avec l'identifiant " + patientId));
            if (!"PATIENT".equalsIgnoreCase(patientUser.getRole())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "L'utilisateur spécifié n'est pas un patient");
            }
            if (!Boolean.TRUE.equals(patientUser.getActif())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Le compte patient n'est pas encore activé par un administrateur");
            }
            // Auto-create a minimal patient entry so the dossier can be linked.
            // With @MapsId, do NOT call setId() — Hibernate derives it from user.id automatically.
            Patient minimal = new Patient();
            minimal.setUser(patientUser);
            return patientRepo.save(minimal);
        });

        if (dossierRepo.existsByPatientId(patient.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un dossier médical existe déjà pour ce patient. Utilisez la mise à jour.");
        }

        dossier.setPatient(patient);
        return dossierRepo.save(dossier);
    }

    // ─── Update (soignant, admin, or patient for their own record) ───────────

    public DossierMedical update(Long dossierId, DossierMedical details, Long requesterId) {
        User requester = getActiveUser(requesterId);
        String role = requester.getRole().toUpperCase();

        DossierMedical existing = dossierRepo.findById(dossierId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier médical introuvable"));

        boolean isAdminOrSoignant = "ADMINISTRATEUR".equals(role) || "SOIGNANT".equals(role);
        boolean isSelfPatient = "PATIENT".equals(role)
                && existing.getPatient() != null
                && requesterId.equals(existing.getPatient().getId());

        if (!isAdminOrSoignant && !isSelfPatient) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès refusé : vous ne pouvez modifier que votre propre dossier médical");
        }

        existing.setContactPatient(details.getContactPatient());
        existing.setTypeDiagnostic(details.getTypeDiagnostic());
        existing.setStade(details.getStade());
        existing.setDateDiagnostic(details.getDateDiagnostic());
        existing.setMaladiesPrincipales(details.getMaladiesPrincipales());
        existing.setAllergies(details.getAllergies());
        existing.setNiveauMemoire(details.getNiveauMemoire());
        existing.setOrientation(details.getOrientation());
        existing.setNiveauFonctionnement(details.getNiveauFonctionnement());
        existing.setMedicamentsActuels(details.getMedicamentsActuels());
        existing.setEtatComportement(details.getEtatComportement());
        existing.setAccompagnantNom(details.getAccompagnantNom());
        existing.setAccompagnantContact(details.getAccompagnantContact());
        existing.setNotesMedecin(details.getNotesMedecin());
        existing.setDerniereVisite(details.getDerniereVisite());

        return dossierRepo.save(existing);
    }

    // ─── Add/update doctor notes only (soignant or admin) ────────────────────

    public DossierMedical updateNotesMedecin(Long dossierId, String notes, Long requesterId) {
        requireAdminOrSoignant(requesterId);
        DossierMedical existing = dossierRepo.findById(dossierId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier médical introuvable"));
        existing.setNotesMedecin(notes);
        return dossierRepo.save(existing);
    }

    // ─── Delete (admin only) ──────────────────────────────────────────────────

    public void delete(Long dossierId, Long requesterId) {
        requireAdmin(requesterId);
        if (!dossierRepo.existsById(dossierId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier médical introuvable");
        }
        dossierRepo.deleteById(dossierId);
    }

    // ─── Access control helpers ───────────────────────────────────────────────

    private void requireAccess(DossierMedical dossier, Long requesterId) {
        User requester = getActiveUser(requesterId);
        String role = requester.getRole().toUpperCase();

        boolean isAdmin = "ADMINISTRATEUR".equals(role);
        boolean isSoignant = "SOIGNANT".equals(role);
        boolean isPatientOwner = "PATIENT".equals(role)
                && dossier.getPatient() != null
                && dossier.getPatient().getId().equals(requesterId);

        if (!isAdmin && !isSoignant && !isPatientOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès refusé : vous n'avez pas les droits pour consulter ce dossier médical");
        }
    }

    private void requireAdminOrSoignant(Long requesterId) {
        User requester = getActiveUser(requesterId);
        String role = requester.getRole().toUpperCase();
        if (!"ADMINISTRATEUR".equals(role) && !"SOIGNANT".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès refusé : seuls les médecins et les administrateurs peuvent effectuer cette action");
        }
    }

    private void requireAdmin(Long requesterId) {
        User requester = getActiveUser(requesterId);
        if (!"ADMINISTRATEUR".equalsIgnoreCase(requester.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès refusé : action réservée aux administrateurs");
        }
    }

    private User getActiveUser(Long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
        if (!Boolean.TRUE.equals(user.getActif())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Votre compte est en attente de validation");
        }
        return user;
    }
}
