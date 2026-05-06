package MemorIA.repository;

import MemorIA.entity.Traitements.Traitements;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TreatmentRepository extends JpaRepository<Traitements, Long> {

    /**
     * Recherche un traitement par titre
     */
    Optional<Traitements> findByTitre(String titre);

    /**
     * Recherche les traitements avec alertes actives
     */
    List<Traitements> findByAlerteActiveTrue();

    /**
     * Recherche les traitements créés après une date donnée
     */
    List<Traitements> findByDateCreationAfter(LocalDateTime date);

    /**
     * Recherche les traitements par type d'alerte
     */
    List<Traitements> findByTypeAlerte(String typeAlerte);
}
