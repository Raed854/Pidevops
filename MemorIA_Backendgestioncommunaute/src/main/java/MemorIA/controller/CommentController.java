package MemorIA.controller;

import MemorIA.entity.community.Comment;
import MemorIA.service.CommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST pour la gestion des interactions sur les commentaires.
 * Port du backend : 8081.
 */
@RestController
@RequestMapping("/comments")
@RequiredArgsConstructor
@Slf4j
public class CommentController {

    private final CommentService commentService;

    /**
     * Récupère la liste structurée des commentaires pour une publication.
     * GET http://localhost:8081/comments/pub/{pubId}
     */
    @GetMapping("/pub/{pubId}")
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long pubId) {
        log.info("Récupération des commentaires pour la publication ID: {}", pubId);
        List<Comment> results = commentService.findTopByPublicationId(pubId);
        return ResponseEntity.ok(results);
    }

    /**
     * Crée un commentaire racine ou une réponse à un commentaire existant.
     * POST http://localhost:8081/comments/pub/{pubId}?parentId={optionalId}
     */
    @PostMapping("/pub/{pubId}")
    public ResponseEntity<Comment> create(@PathVariable Long pubId,
                                         @RequestParam(required = false) Long parentId,
                                         @RequestBody Comment comment) {
        log.info("Ajout d'un commentaire sur la publication ID: {} (Parent optional: {})", pubId, parentId);
        Comment created = commentService.create(pubId, parentId, comment);
        return ResponseEntity.ok(created);
    }

    /**
     * Modifie le contenu d'un commentaire existant.
     * PUT http://localhost:8081/comments/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<Comment> update(@PathVariable Long id, @RequestBody Comment comment) {
        log.info("Mise à jour du commentaire ID: {}", id);
        Comment updated = commentService.update(id, comment);
        return ResponseEntity.ok(updated);
    }

    /**
     * Supprime définitivement un commentaire et ses réponses fils par cascade.
     * DELETE http://localhost:8081/comments/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        log.info("Demande de suppression pour le commentaire ID: {}", id);
        commentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
