package MemorIA.service;

import MemorIA.entity.diagnostic.Rapport;
import MemorIA.repository.RapportRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RapportService {

    private final RapportRepository rapportRepository;

    public RapportService(RapportRepository rapportRepository) {
        this.rapportRepository = rapportRepository;
    }

    public List<Rapport> getAllRapports() {
        return rapportRepository.findAll();
    }

    public Optional<Rapport> getRapportById(Long id) {
        return rapportRepository.findById(id);
    }

    public Rapport saveRapport(Rapport rapport) {
        return rapportRepository.save(rapport);
    }

    public Rapport updateRapport(Long id, Rapport rapportDetails) {
        Rapport rapport = rapportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rapport not found with id: " + id));
        
        rapport.setTitre(rapportDetails.getTitre());
        rapport.setResumer(rapportDetails.getResumer());
        rapport.setAnalyseDetaillee(rapportDetails.getAnalyseDetaillee());
        rapport.setValideParMedecin(rapportDetails.getValideParMedecin());
        rapport.setDateGeneration(rapportDetails.getDateGeneration());
        
        return rapportRepository.save(rapport);
    }

    public void deleteRapport(Long id) {
        rapportRepository.deleteById(id);
    }

    public Optional<Rapport> getRapportByDiagnosticId(Long idDiagnostic) {
        return rapportRepository.findByDiagnosticIdDiagnostic(idDiagnostic);
    }

    public List<Rapport> getRapportsByValidationStatus(Boolean valideParMedecin) {
        return rapportRepository.findByValideParMedecin(valideParMedecin);
    }

    public List<Rapport> searchByUserNomAndPrenom(String nom, String prenom) {
        if (nom != null && !nom.isEmpty() && prenom != null && !prenom.isEmpty()) {
            return rapportRepository.findByDiagnosticUserNomContainingIgnoreCaseAndDiagnosticUserPrenomContainingIgnoreCase(nom, prenom);
        } else if (nom != null && !nom.isEmpty()) {
            return rapportRepository.findByDiagnosticUserNomContainingIgnoreCase(nom);
        } else if (prenom != null && !prenom.isEmpty()) {
            return rapportRepository.findByDiagnosticUserPrenomContainingIgnoreCase(prenom);
        }
        return rapportRepository.findAll();
    }

    public List<Rapport> searchByDiagnosticTitre(String titre) {
        return rapportRepository.findByDiagnosticTitreContainingIgnoreCase(titre);
    }

    public List<Rapport> getValidatedRapports(String search, String sortOrder) {
        Sort sort = "asc".equalsIgnoreCase(sortOrder)
                ? Sort.by("dateGeneration").ascending()
                : Sort.by("dateGeneration").descending();

        if (search == null || search.isBlank()) {
            return rapportRepository.findByValideParMedecin(true, sort);
        }
        return rapportRepository.findValidatedByPatientSearch(search.trim(), sort);
    }
}
