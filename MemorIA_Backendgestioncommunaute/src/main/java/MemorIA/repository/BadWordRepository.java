package MemorIA.repository;

import MemorIA.entity.community.BadWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BadWordRepository extends JpaRepository<BadWord, Long> {
    Optional<BadWord> findByWordIgnoreCase(String word);
}
