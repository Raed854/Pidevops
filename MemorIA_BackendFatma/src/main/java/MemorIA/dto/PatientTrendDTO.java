package MemorIA.dto;

public record PatientTrendDTO(
        String month,
        long alertsCount,
        double observanceRate
) {
}

