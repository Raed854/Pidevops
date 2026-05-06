package MemorIA.controller;

import MemorIA.entity.community.Conversation;
import MemorIA.service.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for conversations - no auth; pass userId in request params
 */
@RestController
@RequestMapping("/conversations")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConversationController {

    private final ConversationService conversationService;

    /** Start private chat between current user and other user */
    @Transactional(readOnly = false)
    @PostMapping("/private")
    public Conversation startPrivate(@RequestParam("userId") Long userId, @RequestParam("otherUserId") Long otherUserId) {
        return conversationService.startPrivate(userId, otherUserId);
    }

    /**
     * List all conversations for user (private + group) - excludes deleted &
     * archived
     */
    @GetMapping
    public List<Conversation> findForUser(@RequestParam("userId") Long userId) {
        return conversationService.findConversationsForUser(userId);
    }

    /** List archived conversations */
    @GetMapping("/archived")
    public List<Conversation> findArchived(@RequestParam("userId") Long userId) {
        return conversationService.findArchivedForUser(userId);
    }

    /** List conversations blocked BY the current user */
    @GetMapping("/blocked")
    public List<Conversation> findBlocked(@RequestParam("userId") Long userId) {
        return conversationService.findBlockedForUser(userId);
    }

    /** Delete conversation for user (remove from list, like FB) */
    @Transactional(readOnly = false)
    @DeleteMapping("/{id}")
    public void deleteForUser(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        conversationService.deleteForUser(id, userId);
    }

    /** Archive conversation for user */
    @Transactional(readOnly = false)
    @PutMapping("/{id}/archive")
    public void archive(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        conversationService.archive(id, userId);
    }

    /** Unarchive conversation */
    @Transactional(readOnly = false)
    @PutMapping("/{id}/unarchive")
    public void unarchive(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        conversationService.unarchive(id, userId);
    }

    /** Get GROUP conversation by community id */
    @GetMapping("/community/{communityId}")
    public Conversation getByCommunity(@PathVariable("communityId") Long communityId, @RequestParam("userId") Long userId) {
        return conversationService.getByCommunityId(communityId, userId);
    }

    @GetMapping("/{id}")
    public Conversation findById(@PathVariable("id") Long id) {
        return conversationService.findById(id);
    }

    @Transactional(readOnly = false)
    @PutMapping("/{id}/block")
    public void block(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        conversationService.block(id, userId);
    }

    @Transactional(readOnly = false)
    @PutMapping("/{id}/unblock")
    public void unblock(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        conversationService.unblock(id, userId);
    }
}
