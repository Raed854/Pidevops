package MemorIA.repository;

import MemorIA.entity.Soignant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SoignantRepository extends JpaRepository<Soignant, Long> {
}
