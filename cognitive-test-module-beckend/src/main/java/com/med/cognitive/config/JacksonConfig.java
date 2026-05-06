package com.med.cognitive.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Configuration Jackson pour la sérialisation/désérialisation des types Java 8 Date/Time.
 * Nécessaire pour que LocalDateTime soit correctement mappé depuis les requêtes JSON
 * du frontend Angular (format : "yyyy-MM-ddTHH:mm:ss").
 */
@Configuration
public class JacksonConfig {

    private static final String DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";
    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern(DATETIME_FORMAT);

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        JavaTimeModule javaTimeModule = new JavaTimeModule();

        // Désérialiseur : accepte "2026-04-17T02:26:00" → LocalDateTime
        javaTimeModule.addDeserializer(LocalDateTime.class,
                new LocalDateTimeDeserializer(FORMATTER));

        // Sérialiseur : LocalDateTime → "2026-04-17T02:26:00" dans les réponses JSON
        javaTimeModule.addSerializer(LocalDateTime.class,
                new LocalDateTimeSerializer(FORMATTER));

        return new ObjectMapper()
                .registerModule(javaTimeModule)
                // Ne pas sérialiser les dates comme timestamps numériques
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                // Ignorer les champs JSON inconnus (robustesse)
                .configure(com.fasterxml.jackson.databind.DeserializationFeature
                        .FAIL_ON_UNKNOWN_PROPERTIES, false);
    }
}
