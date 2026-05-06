package MemorIA.repository;

import MemorIA.entity.community.Publication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PublicationRepository extends JpaRepository<Publication, Long> {
    List<Publication> findAllByOrderByCreatedAtDesc();
    List<Publication> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
}
