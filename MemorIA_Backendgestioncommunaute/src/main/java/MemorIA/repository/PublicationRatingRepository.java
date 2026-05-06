package MemorIA.repository;

import MemorIA.entity.community.Publication;
import MemorIA.entity.community.PublicationRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PublicationRatingRepository extends JpaRepository<PublicationRating, Long> {

    List<PublicationRating> findByUserIdAndPublication(Long userId, Publication publication);

    @Query("SELECT COUNT(r) FROM PublicationRating r WHERE r.publication.id = :pubId")
    long countByPublicationId(@Param("pubId") Long pubId);

    @Query("SELECT COALESCE(AVG(CAST(r.value AS double)), 0) FROM PublicationRating r WHERE r.publication.id = :pubId")
    double getAverageByPublicationId(@Param("pubId") Long pubId);
}
