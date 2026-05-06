package MemorIA.service;

import MemorIA.entity.community.Publication;
import MemorIA.entity.community.PublicationRating;
import MemorIA.repository.PublicationRatingRepository;
import MemorIA.repository.PublicationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class PublicationRatingService {

    private final PublicationRatingRepository ratingRepository;
    private final PublicationRepository publicationRepository;

    public PublicationRatingService(PublicationRatingRepository ratingRepository, PublicationRepository publicationRepository) {
        this.ratingRepository = ratingRepository;
        this.publicationRepository = publicationRepository;
    }

    public void ratePublication(Long pubId, Long userId, Integer value) {
        Publication pub = publicationRepository.findById(pubId)
                .orElseThrow(() -> new RuntimeException("Publication non trouvée avec l'ID: " + pubId));

        if (value < 1 || value > 5) {
            throw new IllegalArgumentException("La note doit être comprise entre 1 et 5");
        }

        List<PublicationRating> existing = ratingRepository.findByUserIdAndPublication(userId, pub);

        if (existing != null && !existing.isEmpty()) {
            PublicationRating rating = existing.get(0);
            rating.setValue(value);
            ratingRepository.save(rating);
        } else {
            PublicationRating rating = new PublicationRating();
            rating.setUserId(userId);
            rating.setPublication(pub);
            rating.setValue(value);
            ratingRepository.save(rating);
        }
    }

    public Map<String, Object> getRatingStats(Long pubId, Long userId) {
        long count = ratingRepository.countByPublicationId(pubId);
        double average = ratingRepository.getAverageByPublicationId(pubId);
        Integer myRating = 0;

        if (userId != null) {
            Publication pub = publicationRepository.findById(pubId).orElse(null);
            if (pub != null) {
                List<PublicationRating> existing = ratingRepository.findByUserIdAndPublication(userId, pub);
                if (existing != null && !existing.isEmpty()) {
                    myRating = existing.get(0).getValue();
                }
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("average", average);
        stats.put("count", count);
        stats.put("myRating", myRating);
        return stats;
    }
}
