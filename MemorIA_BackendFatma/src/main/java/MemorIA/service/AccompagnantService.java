package MemorIA.service;

import MemorIA.entity.Accompagnant;
import MemorIA.entity.Patient;
import MemorIA.entity.User;
import MemorIA.repository.AccompagnantRepository;
import MemorIA.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AccompagnantService {

    private final AccompagnantRepository repo;
    private final UserService userService;
    private final PatientRepository patientRepository;

    public List<Accompagnant> getAll(){
        return repo.findAll();
    }

    public Optional<Accompagnant> getById(Long id){
        return repo.findById(id);
    }

    public Optional<Accompagnant> getByUserId(Long userId){
        return repo.findByUserId(userId);
    }

    public Accompagnant save(Accompagnant a){
        return repo.save(a);
    }

    public Accompagnant upsertProfile(Long userId, Accompagnant details){
        try {
            User user = userService.getActiveUserForRole(userId, "ACCOMPAGNANT");

            // @MapsId: l'ID d'accompagnant doit rester identique à l'ID utilisateur
            Accompagnant a = repo.findByUserId(userId).orElseGet(Accompagnant::new);
            a.setId(userId);
            a.setUser(user);
            a.setLienPatient(details.getLienPatient());
            a.setDateNaissance(details.getDateNaissance());
            a.setAdresse(details.getAdresse());
            a.setCodePostal(details.getCodePostal());
            a.setVille(details.getVille());
            a.setTelephoneSecours(details.getTelephoneSecours());
            a.setSituationPro(details.getSituationPro());
            a.setFrequenceAccompagnement(details.getFrequenceAccompagnement());

            Accompagnant saved = repo.save(a);
            try {
                userService.markProfileCompleted(userId);
            } catch (Exception e) {
                log.warn("Warning: Could not mark profile as completed: {}", e.getMessage());
            }
            return saved;
        } catch (DataIntegrityViolationException e) {
            log.error("Data integrity error while saving accompagnant profile userId={}: {}", userId, e.getMessage(), e);
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid accompagnant profile data. Please verify enum values and required fields."
            );
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error in upsertProfile userId={}: {}", userId, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to save accompagnant profile");
        }
    }

    public Accompagnant update(Long id, Accompagnant details){
        Accompagnant a = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Accompagnant not found"));
        a.setLienPatient(details.getLienPatient());
        a.setDateNaissance(details.getDateNaissance());
        a.setAdresse(details.getAdresse());
        a.setCodePostal(details.getCodePostal());
        a.setVille(details.getVille());
        a.setTelephoneSecours(details.getTelephoneSecours());
        a.setSituationPro(details.getSituationPro());
        a.setFrequenceAccompagnement(details.getFrequenceAccompagnement());
        return repo.save(a);
    }

    public void delete(Long id){
        repo.deleteById(id);
    }

    public Patient assignPatient(Long accompagnantId, Long patientId) {
        Accompagnant accompagnant = repo.findById(accompagnantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Accompagnant introuvable"));
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient introuvable"));

        patient.setAccompagnant(accompagnant);
        patient.setAccompagnantAssignedAt(LocalDateTime.now());
        return patientRepository.save(patient);
    }

    public Patient unassignPatient(Long patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient introuvable"));

        patient.setAccompagnant(null);
        patient.setAccompagnantAssignedAt(null);
        return patientRepository.save(patient);
    }
}
