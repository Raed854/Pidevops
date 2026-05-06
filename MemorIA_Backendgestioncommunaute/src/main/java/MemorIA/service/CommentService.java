package MemorIA.service;

import MemorIA.entity.community.Comment;
import MemorIA.entity.community.Publication;
import MemorIA.repository.CommentRepository;
import MemorIA.repository.PublicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class CommentService {

    private final CommentRepository commentRepository;
    private final PublicationRepository publicationRepository;
    private final BadWordService badWordService;

    public Comment create(Long publicationId, Long parentId, Comment newComment) {
        log.info("Tentative de création de commentaire (Pub: {}, Parent: {})", publicationId, parentId);

        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new RuntimeException("Publication " + publicationId + " non trouvée"));
        newComment.setPublication(publication);

        if (parentId != null) {
            Comment parent = commentRepository.findById(parentId)
                    .orElseThrow(() -> new RuntimeException("Parent " + parentId + " non trouvé"));
            newComment.setParentComment(parent);
        } else {
            newComment.setParentComment(null);
        }

        // -- BAD WORD FILTER LOGIC --
        BadWordService.BadWordAnalysis analysis = badWordService.analyze(newComment.getContent());
        if (analysis.hasBadWords) {
            if (analysis.maxSeverity >= 3) {
                // Bloque complètement
                throw new RuntimeException("BLOCKED_BAD_WORD");
            }
            // Si c'est 1 ou 2, on masque et on met en attente
            newComment.setOriginalContent(newComment.getContent());
            newComment.setContent(analysis.maskedText);
            newComment.setPendingApproval(true);
            newComment.setViolationSeverity(analysis.maxSeverity);
            log.warn("Commentaire mis en attente pour modération (Sévérité: {})", analysis.maxSeverity);
        }

        newComment.setCreatedAt(LocalDateTime.now());
        return commentRepository.save(newComment);
    }

    @Transactional(readOnly = true)
    public List<Comment> findTopByPublicationId(Long publicationId) {
        log.info("Chargement des commentaires racine pour la pub: {}", publicationId);
        return commentRepository.findByPublication_IdAndParentCommentIsNullOrderByCreatedAtAsc(publicationId);
    }

    public Comment findById(Long id) {
        return commentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Commentaire " + id + " non trouvé"));
    }

    public Comment update(Long id, Comment updateReq) {
        log.info("Mise à jour du commentaire ID: {}", id);
        Comment existing = findById(id);

        if (updateReq.getContent() == null || updateReq.getContent().trim().isEmpty()) {
            throw new RuntimeException("Contenu vide interdit.");
        }

        // -- BAD WORD FILTER LOGIC --
        BadWordService.BadWordAnalysis analysis = badWordService.analyze(updateReq.getContent());
        if (analysis.hasBadWords) {
            if (analysis.maxSeverity >= 3) {
                throw new RuntimeException("BLOCKED_BAD_WORD");
            }
            existing.setOriginalContent(updateReq.getContent());
            existing.setContent(analysis.maskedText);
            existing.setPendingApproval(true);
            existing.setViolationSeverity(analysis.maxSeverity);
        } else {
            existing.setContent(updateReq.getContent());
            existing.setPendingApproval(false); // Reset si le nouveau mot est propre
            existing.setViolationSeverity(0);
        }

        return commentRepository.save(existing);
    }

    public void delete(Long id) {
        log.info("Suppression du commentaire ID: {}", id);
        if (!commentRepository.existsById(id)) {
            throw new RuntimeException("Impossible de supprimer car le commentaire " + id + " n'existe pas.");
        }
        commentRepository.deleteById(id);
    }
}
