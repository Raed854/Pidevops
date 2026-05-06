package MemorIA.service;

import MemorIA.repository.CommunityRepository;
import MemorIA.repository.ConversationRepository;
import MemorIA.repository.MessageRepository;
import MemorIA.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final UserRepository userRepository;
    private final CommunityRepository communityRepository;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;

    public Map<String, Long> getGlobalStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalGroups", communityRepository.count());
        stats.put("totalMessages", messageRepository.count());
        stats.put("activeGroups", communityRepository.countByIsBlockedFalse());
        return stats;
    }

    public Map<String, Object> getUserStats(Long userId) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalMessages", messageRepository.countBySenderId(userId));
        stats.put("totalConversations", conversationRepository.countConversationsForUser(userId));

        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        stats.put("messagesThisWeek", messageRepository.countBySenderIdAndCreatedAtAfter(userId, weekAgo));

        stats.put("joinedGroups", communityRepository.countByMembersId(userId));
        return stats;
    }

    public List<Map<String, Object>> getActivityChart() {
        List<Map<String, Object>> chart = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDateTime start = LocalDateTime.now().minusDays(i).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime end = start.plusDays(1);
            long count = messageRepository.countByCreatedAtBetween(start, end);

            Map<String, Object> entry = new HashMap<>();
            entry.put("date", start.toLocalDate().toString());
            entry.put("count", count);
            chart.add(entry);
        }
        return chart;
    }
}
