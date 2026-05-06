package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for current weather data
 * Represents real-time weather conditions for a patient's location
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeatherDTO {

    @JsonProperty("city")
    private String city;

    @JsonProperty("country")
    private String country;

    @JsonProperty("latitude")
    private Double latitude;

    @JsonProperty("longitude")
    private Double longitude;

    @JsonProperty("temperature")
    private Double temperature;

    @JsonProperty("feels_like")
    private Double feelsLike;

    @JsonProperty("humidity")
    private Integer humidity;

    @JsonProperty("condition")
    private String condition; // e.g., "Rainy", "Sunny", "Stormy", "Clear", "Cloudy"

    @JsonProperty("description")
    private String description; // Detailed description

    @JsonProperty("icon")
    private String icon;

    @JsonProperty("wind_speed")
    private Double windSpeed;

    @JsonProperty("wind_direction")
    private String windDirection;

    @JsonProperty("precipitation")
    private Double precipitation;

    @JsonProperty("visibility")
    private Double visibility;

    @JsonProperty("uv_index")
    private Double uvIndex;

    @JsonProperty("pressure")
    private Integer pressure;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    @JsonProperty("is_day")
    private Boolean isDay;

    /**
     * Risk levels for alert generation
     */
    @JsonProperty("rain_risk")
    private String rainRisk; // LOW, MEDIUM, HIGH

    @JsonProperty("storm_risk")
    private String stormRisk; // LOW, MEDIUM, HIGH

    @JsonProperty("temperature_risk")
    private String temperatureRisk; // LOW, MEDIUM, HIGH (extreme cold/heat)

    @JsonProperty("wind_risk")
    private String windRisk; // LOW, MEDIUM, HIGH
}
