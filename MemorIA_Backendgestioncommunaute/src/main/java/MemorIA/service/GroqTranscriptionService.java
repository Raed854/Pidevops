package MemorIA.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.File;

@Service
@Slf4j
@RequiredArgsConstructor
public class GroqTranscriptionService {

    @Value("${groq.api.key:}")
    private String groqApiKey;

    private final FileStorageService fileStorageService;

    public String transcribeAudio(String fileUrl) {
        if (groqApiKey == null || groqApiKey.trim().isEmpty() || "YOUR_GROQ_API_KEY_HERE".equals(groqApiKey)) {
            log.warn("Groq API key is not configured. Skipping transcription.");
            return null;
        }

        try {
            File audioFile = fileStorageService.resolve(fileUrl).toFile();
            if (!audioFile.exists()) {
                log.error("Audio file does not exist: {}", fileUrl);
                return null;
            }

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            // Groq uses "Authorization: Bearer" format
            headers.set("Authorization", "Bearer " + groqApiKey);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new FileSystemResource(audioFile));
            body.add("model", "whisper-large-v3");

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    requestEntity,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode root = mapper.readTree(response.getBody());
                if (root.has("text")) {
                    return root.get("text").asText();
                }
            } else {
                log.error("Groq API failed with status: {}, body: {}", response.getStatusCode(), response.getBody());
            }

        } catch (Exception e) {
            log.error("Error transcribing audio with Groq: {}", e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("401")) {
                log.warn("Groq API authentication failed. Check if API key is valid and not expired.");
            }
        }

        return null;
    }
}
