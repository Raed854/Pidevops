package MemorIA.service;

import MemorIA.entity.community.Publication;
import MemorIA.repository.PublicationRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PublicationService {

    private final PublicationRepository publicationRepository;
    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void initDatabaseSchema() {
        try {
            jdbcTemplate.execute("ALTER TABLE publications_system ADD COLUMN IF NOT EXISTS event_link VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE publications_system ADD COLUMN IF NOT EXISTS event_address VARCHAR(255)");
        } catch (Exception e) {
            // Log notice if needed
        }
    }

    public Publication create(Publication publication) {
        publication.setCreatedAt(LocalDateTime.now());
        return publicationRepository.save(publication);
    }

    public List<Publication> findAll() {
        List<Publication> list = publicationRepository.findAllByOrderByCreatedAtDesc();
        list.forEach(p -> System.out.println("DEBUG PUB " + p.getId() + " - Address: " + p.getEventAddress()));
        return list;
    }

    public List<Publication> findByDoctor(Long doctorId) {
        return publicationRepository.findByDoctorIdOrderByCreatedAtDesc(doctorId);
    }

    public Publication findById(Long id) {
        return publicationRepository.findById(id).orElseThrow(() -> new RuntimeException("Publication non trouvée"));
    }

    public Publication update(Long id, Publication updateReq) {
        Publication pub = findById(id);
        pub.setTitle(updateReq.getTitle());
        pub.setContent(updateReq.getContent());
        pub.setMediaUrl(updateReq.getMediaUrl());
        pub.setMediaType(updateReq.getMediaType());
        pub.setFileName(updateReq.getFileName());
        pub.setType(updateReq.getType());
        pub.setEventLink(updateReq.getEventLink());
        pub.setEventAddress(updateReq.getEventAddress());
        pub.setDoctorName(updateReq.getDoctorName());
        return publicationRepository.save(pub);
    }

    public void delete(Long id) {
        publicationRepository.deleteById(id);
    }
}
