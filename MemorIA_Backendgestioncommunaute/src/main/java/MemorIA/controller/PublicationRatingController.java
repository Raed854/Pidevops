package MemorIA.controller;

import MemorIA.service.PublicationRatingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/ratings")
public class PublicationRatingController {

    private final PublicationRatingService ratingService;

    public PublicationRatingController(PublicationRatingService ratingService) {
        this.ratingService = ratingService;
    }

    @PostMapping("/pub/{pubId}")
    public ResponseEntity<?> ratePublication(
            @PathVariable(name = "pubId") Long pubId,
            @RequestBody RatingRequest request) {
        try {
            if (request == null || request.getUserId() == null || request.getValue() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "UserId ou value manquant"));
            }
            ratingService.ratePublication(pubId, request.getUserId(), request.getValue());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/pub/{pubId}/stats")
    public ResponseEntity<?> getStats(
            @PathVariable(name = "pubId") Long pubId,
            @RequestParam(name = "userId", required = false) Long userId) {
        try {
            return ResponseEntity.ok(ratingService.getRatingStats(pubId, userId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}

class RatingRequest {
    private Long userId;
    private Integer value;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Integer getValue() { return value; }
    public void setValue(Integer value) { this.value = value; }
}
