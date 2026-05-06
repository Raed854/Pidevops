package MemorIA.controller;

import MemorIA.service.ReactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * On utilise un mapping qui commence par /comments/ car nous savons que ce préfixe est fonctionnel 
 * et probablement déjà configuré dans la Gateway/Security du projet.
 */
@RestController
@RequestMapping("/comments/reactions")
public class ReactionController {

    private static final Logger log = LoggerFactory.getLogger(ReactionController.class);
    private final ReactionService reactionService;

    public ReactionController(ReactionService reactionService) {
        this.reactionService = reactionService;
    }

    @GetMapping("/test")
    public ResponseEntity<?> test() {
        return ResponseEntity.ok(Map.of("message", "API Reactions REACHABLE via /comments/reactions/test"));
    }

    @PostMapping("/pub/{pubId}")
    public ResponseEntity<?> reactToPublication(
            @PathVariable(name = "pubId") Long pubId,
            @RequestBody ReactionRequest request) {
        
        try {
            if (request == null || request.getUserId() == null) {
               return ResponseEntity.badRequest().body(Map.of("error", "UserId manquant"));
            }
            log.info("DEBUG: React Pub {} - User {} - Type {}", pubId, request.getUserId(), request.getType());
            reactionService.togglePubReaction(pubId, request.getUserId(), request.getType());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("FATAL: Reaction failed", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/comment/{commentId}")
    public ResponseEntity<?> reactToComment(
            @PathVariable(name = "commentId") Long commentId,
            @RequestBody ReactionRequest request) {
        
        try {
            if (request == null || request.getUserId() == null) {
               return ResponseEntity.badRequest().body(Map.of("error", "UserId manquant"));
            }
            log.info("DEBUG: React Comment {} - User {} - Type {}", commentId, request.getUserId(), request.getType());
            reactionService.toggleCommentReaction(commentId, request.getUserId(), request.getType());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("FATAL: Comment reaction failed", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/pub/{pubId}/count")
    public ResponseEntity<?> getPubCount(@PathVariable(name = "pubId") Long pubId) {
        return ResponseEntity.ok(Map.of("count", reactionService.getPubCount(pubId)));
    }

    @GetMapping("/comment/{commentId}/count")
    public ResponseEntity<?> getCommentCount(@PathVariable(name = "commentId") Long commentId) {
        return ResponseEntity.ok(Map.of("count", reactionService.getCommentCount(commentId)));
    }

    @GetMapping("/pub/{pubId}/user/{userId}")
    public ResponseEntity<?> getUserPubReaction(@PathVariable(name = "pubId") Long pubId, @PathVariable(name = "userId") Long userId) {
        return ResponseEntity.ok(Map.of("reaction", reactionService.getUserPubReaction(pubId, userId)));
    }

    @GetMapping("/comment/{commentId}/user/{userId}")
    public ResponseEntity<?> getUserCommentReaction(@PathVariable(name = "commentId") Long commentId, @PathVariable(name = "userId") Long userId) {
        return ResponseEntity.ok(Map.of("reaction", reactionService.getUserCommentReaction(commentId, userId)));
    }
}
