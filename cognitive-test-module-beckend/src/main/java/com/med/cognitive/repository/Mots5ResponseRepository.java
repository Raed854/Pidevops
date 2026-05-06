package com.med.cognitive.repository;

import com.med.cognitive.entity.Mots5Response;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface Mots5ResponseRepository extends JpaRepository<Mots5Response, Long> {
    List<Mots5Response> findByMots5TestId(Long mots5TestId);
    List<Mots5Response> findByMots5TestIdAndPhase(Long mots5TestId, Mots5Response.ResponsePhase phase);
}
