package com.med.cognitive.repository;

import com.med.cognitive.entity.Mot5Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface Mot5ItemRepository extends JpaRepository<Mot5Item, Long> {
    List<Mot5Item> findByMots5TestIdOrderByOrderIndexAsc(Long mots5TestId);
}
