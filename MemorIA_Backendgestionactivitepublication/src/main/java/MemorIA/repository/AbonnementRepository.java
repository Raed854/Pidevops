package MemorIA.repository;

import MemorIA.entity.Abonnement;
import MemorIA.entity.StatutAbonnement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AbonnementRepository extends JpaRepository<Abonnement, Long> {

    @org.springframework.data.jpa.repository.Query("SELECT a FROM Abonnement a JOIN FETCH a.accompagnant WHERE a.accompagnant.id = :accompagnantId AND a.statut = :statut")
    List<Abonnement> findByAccompagnantIdAndStatut(@Param("accompagnantId") Long accompagnantId, @Param("statut") StatutAbonnement statut);

    List<Abonnement> findAllByOrderByDateDebutDesc();

    @org.springframework.data.jpa.repository.Query("SELECT a FROM Abonnement a JOIN FETCH a.accompagnant WHERE a.accompagnant.id = :accompagnantId ORDER BY a.dateDebut DESC")
    List<Abonnement> findByAccompagnantIdOrderByDateDebutDesc(@Param("accompagnantId") Long accompagnantId);
}
