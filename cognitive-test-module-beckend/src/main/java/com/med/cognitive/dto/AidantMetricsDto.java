package com.med.cognitive.dto;

import java.util.Map;

public record AidantMetricsDto(
        long totalAssigned,
        long totalCompleted,
        double successRate,
        Map<String, Double> avgScoreByType,
        Map<String, Long> monthlyCounts
) {
}
