package MemorIA.service;

import MemorIA.entity.Soignant;
import MemorIA.entity.User;
import MemorIA.repository.SoignantRepository;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class SoignantService {

    private final SoignantRepository repo;
    private final UserService userService;

    public SoignantService(SoignantRepository repo, UserService userService) {
        this.repo = repo;
        this.userService = userService;
    }

    public List<Soignant> getAll(){return repo.findAll();}
    public Optional<Soignant> getById(Long id){return repo.findById(id);}    
    public Soignant save(Soignant s){return repo.save(s);}    
    public Soignant upsertProfile(Long userId, Soignant details){
        User user = userService.getActiveUserForRole(userId, "SOIGNANT");
        validateRequiredFields(details);

        Soignant s = repo.findById(userId).orElseGet(Soignant::new);
        s.setId(userId);
        s.setUser(user);
        s.setNumeroOrdre(details.getNumeroOrdre());
        s.setSpecialite(details.getSpecialite());
        s.setHopital(details.getHopital());
        s.setNumeroTelephone2(details.getNumeroTelephone2());
        s.setDiplomes(details.getDiplomes());
        s.setAnneesExperience(details.getAnneesExperience());
        s.setBiographie(details.getBiographie());
        s.setDateDebutExercice(details.getDateDebutExercice());

        Soignant saved = repo.save(s);
        userService.markProfileCompleted(userId);
        return saved;
    }

    public Soignant update(Long id, Soignant details){
        Soignant s = repo.findById(id).orElseThrow(() -> new RuntimeException("Soignant not found"));
        s.setNumeroOrdre(details.getNumeroOrdre());
        s.setSpecialite(details.getSpecialite());
        s.setHopital(details.getHopital());
        s.setNumeroTelephone2(details.getNumeroTelephone2());
        s.setDiplomes(details.getDiplomes());
        s.setAnneesExperience(details.getAnneesExperience());
        s.setBiographie(details.getBiographie());
        s.setDateDebutExercice(details.getDateDebutExercice());
        return repo.save(s);
    }
    public void delete(Long id){repo.deleteById(id);}    

    private void validateRequiredFields(Soignant details) {
        if (details.getNumeroOrdre() == null || details.getNumeroOrdre().isBlank()
                || details.getSpecialite() == null || details.getSpecialite().isBlank()
                || details.getHopital() == null || details.getHopital().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Required fields: numeroOrdre, specialite, hopital");
        }
    }
}
