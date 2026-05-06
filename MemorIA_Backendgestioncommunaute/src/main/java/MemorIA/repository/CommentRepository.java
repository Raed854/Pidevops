package MemorIA.repository;

import MemorIA.entity.community.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByPublication_IdAndParentCommentIsNullOrderByCreatedAtAsc(Long publicationId);

    List<Comment> findByPendingApprovalTrueOrderByViolationSeverityDescCreatedAtAsc();
}
