package MemorIA.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Calls the Python AI service to predict the IRM state from an image.
 * Python endpoint: POST http://localhost:5000/predict
 * Returns: { "etatIrm": "...", "confidence": 87.3, "allProbabilities": {...} }
 */
@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    private final RestTemplate restTemplate;
    private final String aiServiceUrl;

    public AiService(RestTemplate restTemplate,
                     @Value("${ai.service.url:http://localhost:5000}") String aiServiceUrl) {
        this.restTemplate = restTemplate;
        this.aiServiceUrl = aiServiceUrl;
    }

    /**
     * Send image bytes to the Python AI service and return the predicted etatIrm.
     *
     * @param imageBytes    raw bytes of the image
     * @param fileName      original file name (e.g. "scan.jpg")
     * @return predicted etatIrm string, or null if the AI service is unavailable
     */
    @SuppressWarnings("unchecked")
    public String predictEtatIrm(byte[] imageBytes, String fileName) {
        String url = aiServiceUrl + "/predict";

        try {
            // Build multipart body with the image
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            ByteArrayResource imageResource = new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return fileName != null ? fileName : "image.jpg";
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", imageResource);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                String etatIrm = (String) response.getBody().get("etatIrm");
                Double confidence = response.getBody().get("confidence") instanceof Number n
                        ? n.doubleValue() : null;
                log.info("AI prediction: {} (confidence: {}%)", etatIrm, confidence);
                return etatIrm;
            }

        } catch (ResourceAccessException e) {
            log.warn("AI service unavailable at {} — etatIrm will not be set automatically.", url);
        } catch (Exception e) {
            log.error("Error calling AI service: {}", e.getMessage());
        }

        return null;
    }
}
