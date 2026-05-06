package MemorIA.repository;

import MemorIA.entity.community.Reaction;
import MemorIA.entity.community.Publication;
import MemorIA.entity.community.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository de réaction utilisant des références d'objets directes pour éviter tout souci de mapping.
 */
@Repository
public interface ReactionRepository extends JpaRepository<Reaction, Long> {

    @Query("SELECT r FROM Reaction r WHERE r.userId = :userId AND r.publication = :pub")
    List<Reaction> findByUserIdAndPubObject(@Param("userId") Long userId, @Param("pub") Publication pub);

    @Query("SELECT r FROM Reaction r WHERE r.userId = :userId AND r.comment = :comment")
    List<Reaction> findByUserIdAndCommentObject(@Param("userId") Long userId, @Param("comment") Comment comment);

    @Query("SELECT COUNT(r) FROM Reaction r WHERE r.publication.id = :pubId")
    long countByPubId(@Param("pubId") Long pubId);

    @Query("SELECT COUNT(r) FROM Reaction r WHERE r.comment.id = :commentId")
    long countByCommentId(@Param("commentId") Long commentId);
}
