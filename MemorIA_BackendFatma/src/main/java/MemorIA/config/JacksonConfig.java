package MemorIA.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.LocalTime;
import java.time.ZoneId;
import java.time.Duration;
import java.util.TimeZone;

@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();

        // Module Java 8 date/time
        mapper.registerModule(new JavaTimeModule());

        // Déserializeur flexible pour LocalTime (accepte HH:mm ET HH:mm:ss)
        SimpleModule flexibleTimeModule = new SimpleModule();
        flexibleTimeModule.addDeserializer(LocalTime.class, new LocalTimeDeserializer());
        mapper.registerModule(flexibleTimeModule);

        // Ne pas sérialiser les dates comme timestamps
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Timezone UTC
        mapper.setTimeZone(TimeZone.getTimeZone(ZoneId.of("UTC")));

        return mapper;
    }

    /**
     * RestTemplate bean for external API calls (e.g., Weather API)
     * Configured with timeouts to prevent hanging connections
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }
}
