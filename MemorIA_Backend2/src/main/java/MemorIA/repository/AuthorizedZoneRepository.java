package MemorIA.repository;

import MemorIA.entity.Traitements.ZoneAutorisee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuthorizedZoneRepository extends JpaRepository<ZoneAutorisee, Long> {

    /**
     * Recherche les zones autorisées d'un traitement
     */
    List<ZoneAutorisee> findByTraitementsIdTraitement(Long traitementId);

    /**
     * Recherche une zone autorisée par nom
     */
    Optional<ZoneAutorisee> findByNom(String nom);

    /**
     * Recherche les zones autorisées actives
     */
    List<ZoneAutorisee> findByActifTrue();

    /**
     * Recherche les zones autorisées actives pour un traitement
     */
    List<ZoneAutorisee> findByTraitementsIdTraitementAndActifTrue(Long traitementId);
}
