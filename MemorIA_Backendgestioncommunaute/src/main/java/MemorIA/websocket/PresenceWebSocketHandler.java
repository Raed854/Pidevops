package MemorIA.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PresenceWebSocketHandler extends TextWebSocketHandler {

    /** Maps userId -> active WebSocket session */
    private final ConcurrentHashMap<Long, WebSocketSession> onlineSessions = new ConcurrentHashMap<>();

    /** Maps userId -> last heartbeat timestamp */
    private final ConcurrentHashMap<Long, LocalDateTime> lastSeen = new ConcurrentHashMap<>();

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long userId = extractUserId(session);
        if (userId != null) {
            onlineSessions.put(userId, session);
            lastSeen.put(userId, LocalDateTime.now());
            broadcastPresence();
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Long userId = extractUserId(session);
        if (userId != null) {
            String payload = message.getPayload();
            if ("ping".equals(payload)) {
                lastSeen.put(userId, LocalDateTime.now());
                session.sendMessage(new TextMessage("pong"));
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long userId = extractUserId(session);
        if (userId != null) {
            onlineSessions.remove(userId);
            lastSeen.put(userId, LocalDateTime.now());
            broadcastPresence();
        }
    }

    /** Broadcast currently online user IDs to all connected clients */
    private void broadcastPresence() {
        Set<Long> onlineIds = getOnlineUserIds();
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", "presence");
            event.put("onlineUsers", onlineIds);
            String json = mapper.writeValueAsString(event);
            TextMessage msg = new TextMessage(json);

            for (WebSocketSession s : onlineSessions.values()) {
                if (s.isOpen()) {
                    try {
                        s.sendMessage(msg);
                    } catch (IOException ignored) {
                    }
                }
            }
        } catch (Exception ignored) {
        }
    }

    /** Get currently online user IDs */
    public Set<Long> getOnlineUserIds() {
        return new HashSet<>(onlineSessions.keySet());
    }

    /** Get last seen timestamp for a user */
    public LocalDateTime getLastSeen(Long userId) {
        return lastSeen.getOrDefault(userId, null);
    }

    private Long extractUserId(WebSocketSession session) {
        if (session.getUri() == null) return null;
        String query = session.getUri().getQuery();
        if (query != null && query.contains("userId=")) {
            try {
                String val = query.split("userId=")[1].split("&")[0];
                return Long.parseLong(val);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }
}
