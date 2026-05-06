package MemorIA.config;

import MemorIA.websocket.PresenceWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final PresenceWebSocketHandler presenceHandler;

    public WebSocketConfig(PresenceWebSocketHandler presenceHandler) {
        this.presenceHandler = presenceHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(presenceHandler, "/ws/presence")
                .setAllowedOrigins("*");
    }
}
