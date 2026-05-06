package MemorIA.controller;

import MemorIA.websocket.PresenceWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceWebSocketHandler presenceHandler;

    @GetMapping("/online")
    public Set<Long> getOnlineUsers() {
        return presenceHandler.getOnlineUserIds();
    }

    @GetMapping("/last-seen/{userId}")
    public Map<String, Object> getLastSeen(@PathVariable("userId") Long userId) {
        LocalDateTime lastSeen = presenceHandler.getLastSeen(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("userId", userId);
        result.put("online", presenceHandler.getOnlineUserIds().contains(userId));
        result.put("lastSeen", lastSeen != null ? lastSeen.toString() : null);
        return result;
    }
}
