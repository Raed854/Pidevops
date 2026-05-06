package MemorIA.controller;

import MemorIA.entity.community.Comment;
import MemorIA.repository.CommentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/moderation/comments")
public class ModerationController {

    private final CommentRepository commentRepository;

    public ModerationController(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Comment>> getPendingComments() {
        return ResponseEntity.ok(commentRepository.findByPendingApprovalTrueOrderByViolationSeverityDescCreatedAtAsc());
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveComment(@PathVariable("id") Long id) {
        return commentRepository.findById(id).map(comment -> {
            comment.setPendingApproval(false);
            // Optionally: keep the *** masked, but the comment is now active.
            // If they wanted to restore the original, you'd do: comment.setContent(comment.getOriginalContent());
            commentRepository.save(comment);
            return ResponseEntity.ok(Map.of("success", true, "message", "Commentaire approuvé"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectComment(@PathVariable("id") Long id) {
        return commentRepository.findById(id).map(comment -> {
            commentRepository.delete(comment);
            return ResponseEntity.ok(Map.of("success", true, "message", "Commentaire supprimé"));
        }).orElse(ResponseEntity.notFound().build());
    }
}
