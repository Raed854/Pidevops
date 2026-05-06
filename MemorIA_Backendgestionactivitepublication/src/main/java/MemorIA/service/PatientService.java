package MemorIA.service;

import MemorIA.entity.Patient;
import MemorIA.entity.User;
import MemorIA.repository.PatientRepository;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class PatientService {

    private final PatientRepository repo;
    private final UserService userService;

    public PatientService(PatientRepository repo, UserService userService) {
        this.repo = repo;
        this.userService = userService;
    }

    public List<Patient> getAll(){return repo.findAll();}
    public Optional<Patient> getById(Long id){return repo.findById(id);}    
    public Patient save(Patient p){return repo.save(p);}    
    public Patient upsertProfile(Long userId, Patient details){
        User user = userService.getActiveUserForRole(userId, "PATIENT");
        validateRequiredFields(details);

        Patient p = repo.findById(userId).orElseGet(Patient::new);
        p.setId(userId);
        p.setUser(user);
        p.setDateNaissance(details.getDateNaissance());
        p.setSexe(details.getSexe());
        p.setNumeroSecuriteSociale(details.getNumeroSecuriteSociale());
        p.setAdresse(details.getAdresse());
        p.setVille(details.getVille());
        p.setGroupeSanguin(details.getGroupeSanguin());
        p.setMutuelle(details.getMutuelle());
        p.setNumeroPoliceMutuelle(details.getNumeroPoliceMutuelle());
        p.setDossierMedicalPath(details.getDossierMedicalPath());

        Patient saved = repo.save(p);
        userService.markProfileCompleted(userId);
        return saved;
    }

    public Patient update(Long id, Patient details){
        Patient p = repo.findById(id).orElseThrow(() -> new RuntimeException("Patient not found"));
        p.setDateNaissance(details.getDateNaissance());
        p.setSexe(details.getSexe());
        p.setNumeroSecuriteSociale(details.getNumeroSecuriteSociale());
        p.setAdresse(details.getAdresse());
        p.setVille(details.getVille());
        p.setGroupeSanguin(details.getGroupeSanguin());
        p.setMutuelle(details.getMutuelle());
        p.setNumeroPoliceMutuelle(details.getNumeroPoliceMutuelle());
        return repo.save(p);
    }
    public void delete(Long id){repo.deleteById(id);}    

    private void validateRequiredFields(Patient details) {
        if (details.getDateNaissance() == null
                || details.getSexe() == null
                || details.getNumeroSecuriteSociale() == null
                || details.getNumeroSecuriteSociale().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Required fields: dateNaissance, sexe, numeroSecuriteSociale");
        }
    }
}
