package MemorIA.service;

import MemorIA.entity.community.Community;
import MemorIA.entity.community.Conversation;
import MemorIA.entity.community.ConversationType;
import MemorIA.entity.community.UserConversationState;
import MemorIA.entity.Role;
import MemorIA.entity.User;
import MemorIA.repository.CommunityRepository;
import MemorIA.repository.ConversationRepository;
import MemorIA.repository.MessageRepository;
import MemorIA.repository.UserConversationStateRepository;
import MemorIA.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private final CommunityRepository communityRepo;
    private final ConversationRepository conversationRepo;
    private final MessageRepository messageRepo;
    private final UserConversationStateRepository stateRepo;
    private final UserRepository userRepo;

    private void validateRole(Long userId) {
        User u = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found: " + userId));
        if (u.getRole() != Role.SOIGNANT && u.getRole() != Role.ACCOMPAGNANT) {
            throw new RuntimeException("Only DOCTOR and CAREGIVER can access communities");
        }
    }

    /** Create a new community/group and its GROUP conversation */
    @Transactional
    public Community create(Community c, Long userId) {
        validateRole(userId);
        User user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getRole() != Role.SOIGNANT && user.getRole() != Role.ACCOMPAGNANT) {
            throw new RuntimeException("Only DOCTORs and CARETAKERs can create groups");
        }

        // Reload all members from DB so they are managed entities
        Set<User> managedMembers = new HashSet<>();
        if (c.getMembers() != null) {
            for (User m : c.getMembers()) {
                if (m.getId() != null) {
                    userRepo.findById(m.getId()).ifPresent(managedMembers::add);
                }
            }
        }
        managedMembers.add(user);
        c.setMembers(managedMembers);

        // Rule enforcement: Min 2 members (Creator + at least 1 other)
        if (c.getMembers().size() < 2) {
            throw new RuntimeException("Un groupe doit avoir au moins 2 membres (vous + au moins un autre).");
        }

        c.setCreatedBy(user);
        c.setPrivate(true); // Force groups to be private
        Community saved = communityRepo.save(c);

        // Create associated GROUP conversation
        Conversation conv = new Conversation();
        conv.setType(ConversationType.GROUP);
        conv.setCommunity(saved);
        conv.setParticipants(new HashSet<>());
        conversationRepo.save(conv);

        return saved;
    }

    /** Deletion */
    @Transactional
    public void delete(Long id, Long userId) {
        validateRole(userId);
        Community c = communityRepo.findById(id).orElseThrow(() -> new RuntimeException("Community not found"));
        User actor = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (!c.getCreatedBy().getId().equals(userId) && actor.getRole() != Role.SOIGNANT) {
            throw new RuntimeException("Only creator or doctors can delete the group");
        }

        // Delete all associated data
        conversationRepo.findByCommunityId(id).ifPresent(conv -> {
            messageRepo.deleteByConversationId(conv.getId());
            stateRepo.deleteByConversationId(conv.getId());
            conversationRepo.delete(conv);
        });

        communityRepo.delete(c);
    }

    /** Archiving */
    @Transactional
    public void archive(Long id, Long userId) {
        validateRole(userId);
        Community c = communityRepo.findById(id).orElseThrow(() -> new RuntimeException("Community not found"));
        User actor = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (!c.getCreatedBy().getId().equals(userId) && actor.getRole() != Role.SOIGNANT) {
            throw new RuntimeException("Only creator or doctors can archive the group");
        }
        c.setArchived(true);
        communityRepo.save(c);
    }

    @Transactional
    public void unarchive(Long id, Long userId) {
        validateRole(userId);
        Community c = communityRepo.findById(id).orElseThrow(() -> new RuntimeException("Community not found"));
        User actor = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (!c.getCreatedBy().getId().equals(userId) && actor.getRole() != Role.SOIGNANT) {
            throw new RuntimeException("Only creator or doctors can unarchive the group");
        }
        c.setArchived(false);
        communityRepo.save(c);
    }

    /** Caregiver List & Stats */
    public java.util.Map<String, Object> getCommunityStats() {
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("totalCaregivers", userRepo.countByRole(Role.ACCOMPAGNANT));
        stats.put("totalPrivateGroups", communityRepo.count());
        stats.put("totalMessages", messageRepo.count());
        return stats;
    }

    public List<User> findAllCaregivers() {
        return userRepo.findByRole(Role.ACCOMPAGNANT);
    }

    public List<User> findAllUsers() {
        return userRepo.findAll();
    }

    /** List all communities (for discovery / join) - only public ones */
    public List<Community> findAll(Long userId) {
        validateRole(userId);
        return communityRepo.findUserGroups(userId); // Show only joined groups
    }

    /** List communities the user has joined (findUserGroups) */
    public List<Community> findUserGroups(Long userId) {
        validateRole(userId);
        return communityRepo.findUserGroups(userId);
    }

    public Community findById(Long id) {
        return communityRepo.findById(id).orElseThrow(() -> new RuntimeException("Community not found: " + id));
    }

    /**
     * Join a community - add user to members and ensure GROUP conversation exists
     */
    @Transactional
    public void join(Long id, Long userId) {
        validateRole(userId);
        Community c = communityRepo.findById(id).orElseThrow(() -> new RuntimeException("Community not found"));
        if (c.isBlocked() || c.isArchived())
            throw new RuntimeException("Community is blocked or archived");
        User u = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (c.getMembers() == null)
            c.setMembers(new HashSet<>());
        c.getMembers().add(u);
        communityRepo.save(c);
    }

    /** Leave a community */
    @Transactional
    public void leave(Long id, Long userId) {
        validateRole(userId);
        Community c = communityRepo.findById(id).orElseThrow(() -> new RuntimeException("Community not found"));
        c.getMembers().removeIf(u -> u.getId().equals(userId));
        communityRepo.save(c);
    }

    /** Block community - only creator can block */
    @Transactional
    public void block(Long id, Long userId) {
        validateRole(userId);
        Community c = communityRepo.findById(id).orElseThrow(() -> new RuntimeException("Community not found"));
        User actor = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (!c.getCreatedBy().getId().equals(userId) && actor.getRole() != Role.SOIGNANT) {
            throw new RuntimeException("Only creator or doctors can block the community");
        }
        c.setBlocked(true);
        communityRepo.save(c);
    }

    @Transactional
    public void unblock(Long id, Long userId) {
        validateRole(userId);
        Community c = communityRepo.findById(id).orElseThrow(() -> new RuntimeException("Community not found"));
        User actor = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (!c.getCreatedBy().getId().equals(userId) && actor.getRole() != Role.SOIGNANT) {
            throw new RuntimeException("Only creator or doctors can unblock the community");
        }
        c.setBlocked(false);
        communityRepo.save(c);
    }

    /** Add a member to a community - only creator can add */
    @Transactional
    public void addMember(Long communityId, Long memberId, Long creatorId) {
        validateRole(creatorId);
        Community c = communityRepo.findById(communityId)
                .orElseThrow(() -> new RuntimeException("Community not found"));
        User actor = userRepo.findById(creatorId).orElseThrow(() -> new RuntimeException("User not found"));
        if (!c.getCreatedBy().getId().equals(creatorId) && actor.getRole() != Role.SOIGNANT) {
            throw new RuntimeException("Only the group creator or doctors can add members");
        }
        User newMember = userRepo.findById(memberId).orElseThrow(() -> new RuntimeException("User not found"));
        if (c.getMembers() == null)
            c.setMembers(new HashSet<>());
        c.getMembers().add(newMember);
        communityRepo.save(c);

        // Also ensure if they had deleted the group discussion before, it reappears
        conversationRepo.findByCommunityId(communityId).ifPresent(conv -> {
            UserConversationState state = stateRepo.findByUserIdAndConversationId(memberId, conv.getId())
                    .orElseGet(() -> {
                        UserConversationState s = new UserConversationState();
                        s.setUser(newMember);
                        s.setConversation(conv);
                        return s;
                    });
            state.setDeleted(false);
            state.setArchived(false);
            stateRepo.save(state);
        });
    }

    /** Remove a member from a community - only creator can remove */
    @Transactional
    public void removeMember(Long communityId, Long memberId, Long creatorId) {
        validateRole(creatorId);
        Community c = communityRepo.findById(communityId)
                .orElseThrow(() -> new RuntimeException("Community not found"));
        User actor = userRepo.findById(creatorId).orElseThrow(() -> new RuntimeException("User not found"));
        if (!c.getCreatedBy().getId().equals(creatorId) && actor.getRole() != Role.SOIGNANT) {
            throw new RuntimeException("Only the group creator or doctors can remove members");
        }
        if (c.getCreatedBy().getId().equals(memberId)) {
            throw new RuntimeException("Cannot remove the creator of the group");
        }

        // Min 2 members enforcement on removal
        if (c.getMembers().size() <= 2) {
            throw new RuntimeException("A group must have at least 2 members. Cannot remove.");
        }

        c.getMembers().removeIf(u -> u.getId().equals(memberId));
        communityRepo.save(c);
    }

    /** Update community name and description - only creator can update */
    @Transactional
    public Community update(Long id, Community updated, Long userId) {
        validateRole(userId);
        Community c = communityRepo.findById(id).orElseThrow(() -> new RuntimeException("Community not found"));
        User user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (!c.getCreatedBy().getId().equals(userId) && user.getRole() != Role.SOIGNANT) {
            throw new RuntimeException("Only creator or doctors can update group settings");
        }
        if (updated.getName() != null && !updated.getName().trim().isEmpty()) {
            c.setName(updated.getName().trim());
        }
        if (updated.getDescription() != null) {
            c.setDescription(updated.getDescription().trim());
        }
        if (updated.getTags() != null) {
            c.setTags(updated.getTags().trim());
        }
        c.setPrivate(updated.isPrivate());
        return communityRepo.save(c);
    }

    public List<Community> search(String query, Long userId) {
        validateRole(userId);
        if (query == null || query.trim().isEmpty()) {
            return communityRepo.findUserGroups(userId);
        }
        return communityRepo.findByNameContainingIgnoreCaseAndIsPrivateFalse(query);
    }
}
