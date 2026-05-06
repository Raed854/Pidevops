package com.med.cognitive.repository;

import com.med.cognitive.entity.Soignant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SoignantRepository extends JpaRepository<Soignant, Long> {
}
