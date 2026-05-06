package MemorIA.service;

import MemorIA.entity.community.Comment;
import MemorIA.entity.community.Publication;
import MemorIA.entity.community.Reaction;
import MemorIA.repository.CommentRepository;
import MemorIA.repository.PublicationRepository;
import MemorIA.repository.ReactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ReactionService {

    private static final Logger log = LoggerFactory.getLogger(ReactionService.class);

    private final ReactionRepository reactionRepository;
    private final PublicationRepository publicationRepository;
    private final CommentRepository commentRepository;

    // Constructeur manuel pour 0 dépendance Lombok
    public ReactionService(ReactionRepository reactionRepository,
            PublicationRepository publicationRepository,
            CommentRepository commentRepository) {
        this.reactionRepository = reactionRepository;
        this.publicationRepository = publicationRepository;
        this.commentRepository = commentRepository;
    }

    @Transactional
    public void togglePubReaction(Long pubId, Long userId, String type) {
        log.info("Processing reaction for Pub with ID: {} by User: {} Type: {}", pubId, userId, type);

        // 1. Récupérer l'objet publication d'abord pour assurer le lien JPA
        Publication pub = publicationRepository.findById(pubId)
                .orElseThrow(() -> new RuntimeException("Publication non trouvée avec l'ID: " + pubId));

        // 2. Chercher la réaction via l'objet directe
        List<Reaction> existing = reactionRepository.findByUserIdAndPubObject(userId, pub);

        if (existing != null && !existing.isEmpty()) {
            Reaction r = existing.get(0);
            if (r.getType() != null && r.getType().equalsIgnoreCase(type)) {
                // Même emoji -> Suppression de toutes les erreurs possibles
                reactionRepository.deleteAll(existing);
                reactionRepository.flush();
                log.info("DEBUG: Reaction removed correctly (toggle off)");
            } else {
                r.setType(type);
                if (existing.size() > 1) {
                    reactionRepository.deleteAll(existing.subList(1, existing.size()));
                }
                reactionRepository.saveAndFlush(r);
                log.info("DEBUG: Reaction changed to " + type);
            }
        } else {
            // Création propre
            Reaction r = new Reaction();
            r.setUserId(userId);
            r.setType(type);
            r.setPublication(pub);
            r.setCreatedAt(LocalDateTime.now());
            reactionRepository.saveAndFlush(r);
            log.info("DEBUG: New Reaction " + type + " created for pub " + pubId);
        }
    }

    @Transactional
    public void toggleCommentReaction(Long commentId, Long userId, String type) {
        log.info("Processing reaction for Comment: {} by User: {} Type: {}", commentId, userId, type);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Commentaire non trouvé (ID: " + commentId + ")"));

        List<Reaction> existing = reactionRepository.findByUserIdAndCommentObject(userId, comment);

        if (existing != null && !existing.isEmpty()) {
            Reaction r = existing.get(0);
            if (r.getType() != null && r.getType().equalsIgnoreCase(type)) {
                reactionRepository.deleteAll(existing);
                reactionRepository.flush();
            } else {
                r.setType(type);
                if (existing.size() > 1) {
                    reactionRepository.deleteAll(existing.subList(1, existing.size()));
                }
                reactionRepository.saveAndFlush(r);
            }
        } else {
            Reaction r = new Reaction();
            r.setUserId(userId);
            r.setType(type);
            r.setComment(comment);
            r.setCreatedAt(LocalDateTime.now());
            reactionRepository.saveAndFlush(r);
        }
    }

    public long getPubCount(Long pubId) {
        return reactionRepository.countByPubId(pubId);
    }

    public long getCommentCount(Long commentId) {
        return reactionRepository.countByCommentId(commentId);
    }

    public String getUserPubReaction(Long pubId, Long userId) {
        Publication pub = publicationRepository.findById(pubId).orElse(null);
        if (pub == null)
            return "";
        List<Reaction> existing = reactionRepository.findByUserIdAndPubObject(userId, pub);
        return (existing == null || existing.isEmpty()) ? "" : existing.get(0).getType();
    }

    public String getUserCommentReaction(Long commentId, Long userId) {
        Comment comment = commentRepository.findById(commentId).orElse(null);
        if (comment == null)
            return "";
        List<Reaction> existing = reactionRepository.findByUserIdAndCommentObject(userId, comment);
        return (existing == null || existing.isEmpty()) ? "" : existing.get(0).getType();
    }
}
