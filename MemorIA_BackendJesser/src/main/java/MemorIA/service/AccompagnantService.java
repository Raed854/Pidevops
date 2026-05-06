package MemorIA.service;

import MemorIA.entity.Accompagnant;
import MemorIA.entity.User;
import MemorIA.repository.AccompagnantRepository;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class AccompagnantService {

    private final AccompagnantRepository repo;
    private final UserService userService;

    public AccompagnantService(AccompagnantRepository repo, UserService userService) {
        this.repo = repo;
        this.userService = userService;
    }

    public List<Accompagnant> getAll(){return repo.findAll();}
    public Optional<Accompagnant> getById(Long id){return repo.findById(id);}    
    public Accompagnant save(Accompagnant a){return repo.save(a);}    
    public Accompagnant upsertProfile(Long userId, Accompagnant details){
        User user = userService.getActiveUserForRole(userId, "ACCOMPAGNANT");
        validateRequiredFields(details);

        Accompagnant a = repo.findById(userId).orElseGet(Accompagnant::new);
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
        userService.markProfileCompleted(userId);
        return saved;
    }

    public Accompagnant update(Long id, Accompagnant details){
        Accompagnant a = repo.findById(id).orElseThrow(() -> new RuntimeException("Accompagnant not found"));
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
    public void delete(Long id){repo.deleteById(id);}    

    private void validateRequiredFields(Accompagnant details) {
        if (details.getLienPatient() == null
                || details.getDateNaissance() == null
                || details.getFrequenceAccompagnement() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Required fields: lienPatient, dateNaissance, frequenceAccompagnement");
        }
    }
}
