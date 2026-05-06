package MemorIA.service;

import MemorIA.entity.Administrateur;
import MemorIA.repository.AdministrateurRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AdministrateurService {

    private final AdministrateurRepository repo;

    public AdministrateurService(AdministrateurRepository repo) {
        this.repo = repo;
    }

    public List<Administrateur> getAll() {return repo.findAll();}
    public Optional<Administrateur> getById(Long id){return repo.findById(id);}    
    public Administrateur save(Administrateur a){return repo.save(a);}    
    public Administrateur update(Long id, Administrateur details){
        Administrateur a = repo.findById(id).orElseThrow(() -> new RuntimeException("Administrateur not found"));
        a.setNiveauAcces(details.getNiveauAcces());
        a.setDepartement(details.getDepartement());
        a.setDroitsSpeciaux(details.getDroitsSpeciaux());
        a.setResponsableAu(details.getResponsableAu());
        a.setDateDebutMandat(details.getDateDebutMandat());
        a.setDateFinMandat(details.getDateFinMandat());
        return repo.save(a);
    }
    public void delete(Long id){repo.deleteById(id);}    
}
