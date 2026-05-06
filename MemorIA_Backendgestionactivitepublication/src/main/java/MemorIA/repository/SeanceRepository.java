package MemorIA.repository;

import MemorIA.entity.Seance;
import MemorIA.entity.StatutSeance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeanceRepository extends JpaRepository<Seance, Long> {
    List<Seance> findByActiviteId(Long activiteId);
    List<Seance> findByStatut(StatutSeance statut);
}
