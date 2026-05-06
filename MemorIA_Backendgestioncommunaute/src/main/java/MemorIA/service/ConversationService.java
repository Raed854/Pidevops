package MemorIA.service;

import MemorIA.entity.community.*;
import MemorIA.entity.Role;
import MemorIA.entity.User;
import MemorIA.repository.CommunityRepository;
import MemorIA.repository.ConversationRepository;
import MemorIA.repository.UserConversationStateRepository;
import MemorIA.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepo;
    private final CommunityRepository communityRepo;
    private final UserConversationStateRepository stateRepo;
    private final UserRepository userRepo;

    private void validateRole(Long userId) {
        User u = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found: " + userId));
        if (u.getRole() != Role.SOIGNANT && u.getRole() != Role.ACCOMPAGNANT) {
            throw new RuntimeException("Only DOCTOR and CAREGIVER can access conversations");
        }
    }

    private boolean isParticipant(Conversation c, Long userId) {
        if (c.getType() == ConversationType.PRIVATE) {
            return c.getParticipants().stream().anyMatch(u -> u.getId().equals(userId));
        }
        return c.getCommunity() != null && c.getCommunity().getMembers().stream()
                .anyMatch(u -> u.getId().equals(userId));
    }

    private boolean isDeletedForUser(Conversation c, Long userId) {
        return stateRepo.findByUserIdAndConversationId(userId, c.getId())
                .map(UserConversationState::isDeleted)
                .orElse(false);
    }

    private boolean isArchivedForUser(Conversation c, Long userId) {
        return stateRepo.findByUserIdAndConversationId(userId, c.getId())
                .map(UserConversationState::isArchived)
                .orElse(false);
    }

    @Transactional
    public Conversation startPrivate(Long currentUserId, Long otherUserId) {
        validateRole(currentUserId);
        validateRole(otherUserId);
        if (currentUserId.equals(otherUserId)) {
            throw new RuntimeException("Cannot start private chat with yourself");
        }
        Conversation conv = conversationRepo.findConversationByUsers(currentUserId, otherUserId)
                .orElseGet(() -> {
                    Conversation c = new Conversation();
                    c.setType(ConversationType.PRIVATE);
                    Set<User> participants = new HashSet<>();
                    participants.add(userRepo.findById(currentUserId).orElseThrow());
                    participants.add(userRepo.findById(otherUserId).orElseThrow());
                    c.setParticipants(participants);
                    return conversationRepo.save(c);
                });

        // Reset deleted/archived state for the current user so it reappears in their
        // list
        UserConversationState state = stateRepo.findByUserIdAndConversationId(currentUserId, conv.getId())
                .orElseGet(() -> {
                    UserConversationState s = new UserConversationState();
                    s.setUser(userRepo.findById(currentUserId).orElseThrow());
                    s.setConversation(conv);
                    return s;
                });
        state.setDeleted(false);
        state.setArchived(false);
        stateRepo.save(state);

        return conv;
    }

    public Conversation getOrCreateGroupConversation(Long communityId) {
        Community com = communityRepo.findById(communityId)
                .orElseThrow(() -> new RuntimeException("Community not found"));
        return conversationRepo.findByCommunityId(communityId)
                .orElseGet(() -> {
                    Conversation c = new Conversation();
                    c.setType(ConversationType.GROUP);
                    c.setCommunity(com);
                    c.setParticipants(new HashSet<>());
                    return conversationRepo.save(c);
                });
    }

    /** List conversations for user - exclude deleted */
    public List<Conversation> findConversationsForUser(Long userId) {
        validateRole(userId);
        List<Conversation> all = conversationRepo.findConversationsForUser(userId);
        return all.stream()
                .filter(c -> isParticipant(c, userId))
                .filter(c -> !isDeletedForUser(c, userId))
                .filter(c -> !isArchivedForUser(c, userId))
                .collect(Collectors.toList());
    }

    /** List archived conversations */
    public List<Conversation> findArchivedForUser(Long userId) {
        validateRole(userId);
        return stateRepo.findByUserIdAndArchivedTrueAndDeletedFalse(userId).stream()
                .map(UserConversationState::getConversation)
                .filter(c -> isParticipant(c, userId))
                .collect(Collectors.toList());
    }

    /** List conversations blocked by the current user */
    public List<Conversation> findBlockedForUser(Long userId) {
        validateRole(userId);
        return conversationRepo.findBlockedByUser(userId);
    }

    public Conversation getByCommunityId(Long communityId, Long userId) {
        validateRole(userId);
        return conversationRepo.findByCommunityId(communityId)
                .orElseGet(() -> getOrCreateGroupConversation(communityId));
    }

    public Conversation findById(Long id) {
        return conversationRepo.findById(id).orElseThrow(() -> new RuntimeException("Conversation not found: " + id));
    }

    /** Delete conversation for current user (remove from list, like FB) */
    @Transactional
    public void deleteForUser(Long conversationId, Long userId) {
        validateRole(userId);
        Conversation c = conversationRepo.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        if (!isParticipant(c, userId))
            throw new RuntimeException("You are not a participant");
        UserConversationState state = stateRepo.findByUserIdAndConversationId(userId, conversationId)
                .orElseGet(() -> {
                    UserConversationState s = new UserConversationState();
                    s.setUser(userRepo.findById(userId).orElseThrow());
                    s.setConversation(c);
                    s.setArchived(false);
                    return s;
                });
        state.setDeleted(true);
        state.setArchived(false);
        stateRepo.save(state);
    }

    /** Archive conversation for user */
    @Transactional
    public void archive(Long conversationId, Long userId) {
        validateRole(userId);
        Conversation c = conversationRepo.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        if (!isParticipant(c, userId))
            throw new RuntimeException("You are not a participant");
        UserConversationState state = stateRepo.findByUserIdAndConversationId(userId, conversationId)
                .orElseGet(() -> {
                    UserConversationState s = new UserConversationState();
                    s.setUser(userRepo.findById(userId).orElseThrow());
                    s.setConversation(c);
                    s.setDeleted(false);
                    return s;
                });
        state.setArchived(true);
        state.setDeleted(false);
        stateRepo.save(state);
    }

    /** Unarchive conversation */
    @Transactional
    public void unarchive(Long conversationId, Long userId) {
        validateRole(userId);
        Optional<UserConversationState> opt = stateRepo.findByUserIdAndConversationId(userId, conversationId);
        if (opt.isPresent()) {
            UserConversationState state = opt.get();
            state.setArchived(false);
            stateRepo.save(state);
        }
    }

    @Transactional
    public void block(Long id, Long userId) {
        validateRole(userId);
        Conversation c = conversationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        if (c.getType() == ConversationType.GROUP) {
            User actor = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
            if (c.getCommunity() == null
                    || (!c.getCommunity().getCreatedBy().getId().equals(userId) && actor.getRole() != Role.SOIGNANT)) {
                throw new RuntimeException("Only community creator or doctors can block group discussion");
            }
        } else {
            boolean isParticipant = c.getParticipants().stream().anyMatch(u -> u.getId().equals(userId));
            if (!isParticipant)
                throw new RuntimeException("You are not a participant");

            // Caregivers cannot block doctors
            User other = c.getParticipants().stream()
                    .filter(u -> !u.getId().equals(userId))
                    .findFirst().orElse(null);
            User actor = userRepo.findById(userId).orElseThrow();
            if (actor.getRole() == Role.ACCOMPAGNANT && other != null && other.getRole() == Role.SOIGNANT) {
                throw new RuntimeException("Les soignants ne peuvent pas bloquer les médecins.");
            }
        }
        c.setBlocked(true);
        c.setBlockedBy(userRepo.findById(userId).orElseThrow());
        conversationRepo.save(c);
    }

    @Transactional
    public void unblock(Long id, Long userId) {
        validateRole(userId);
        Conversation c = conversationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        if (c.getType() == ConversationType.GROUP) {
            User actor = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
            if (c.getCommunity() == null
                    || (!c.getCommunity().getCreatedBy().getId().equals(userId) && actor.getRole() != Role.SOIGNANT)) {
                throw new RuntimeException("Only community creator or doctors can unblock");
            }
        }
        c.setBlocked(false);
        c.setBlockedBy(null);
        conversationRepo.save(c);
    }
}
