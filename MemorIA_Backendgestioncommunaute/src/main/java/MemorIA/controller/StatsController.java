package MemorIA.controller;

import MemorIA.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stats")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    @GetMapping
    public Map<String, Long> getStats() {
        return statsService.getGlobalStats();
    }

    @GetMapping("/user/{userId}")
    public Map<String, Object> getUserStats(@PathVariable("userId") Long userId) {
        return statsService.getUserStats(userId);
    }

    @GetMapping("/activity")
    public List<Map<String, Object>> getActivityChart() {
        return statsService.getActivityChart();
    }
}
