package MemorIA.repository;

import MemorIA.entity.Activite;
import MemorIA.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActiviteRepository extends JpaRepository<Activite, Long> {
    List<Activite> findBySoignant(User soignant);
    List<Activite> findBySoignantId(Long soignantId);
}
