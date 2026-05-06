package MemorIA.service;

import MemorIA.dto.WeatherDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;

/**
 * Weather Service - Integrates with Open-Meteo API (free, no auth required)
 * Provides weather data and weather condition assessment for alert generation
 *
 * Open-Meteo API: https://api.open-meteo.com/v1/forecast
 * - Free tier with no API key required
 * - Excellent for geographic weather data
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WeatherService {

    private final RestTemplate restTemplate;

    @Value("${weather.api.base-url:https://api.open-meteo.com/v1/forecast}")
    private String weatherApiBaseUrl;

    @Value("${weather.default.city:Tunis}")
    private String defaultCity;

    @Value("${weather.default.country:Tunisie}")
    private String defaultCountry;

    @Value("${weather.default.latitude:36.8065}")
    private Double defaultLatitude;

    @Value("${weather.default.longitude:10.1686}")
    private Double defaultLongitude;

    /**
     * Get current weather for a specific location (latitude, longitude)
     * Open-Meteo provides hourly and daily forecasts
     * 
     * @param latitude Geographic latitude
     * @param longitude Geographic longitude
     * @param city City name for reference
     * @return WeatherDTO with current conditions
     */
    public WeatherDTO getCurrentWeather(Double latitude, Double longitude, String city) {
        return getCurrentWeather(latitude, longitude, city, defaultCountry);
    }

    public WeatherDTO getCurrentWeather(Double latitude, Double longitude, String city, String country) {
        try {
            log.info("[weather] Fetching weather for {}: lat={}, lon={}", city, latitude, longitude);

            // Open-Meteo API call with comprehensive parameters
            String apiUrl = String.format(
                    "%s?latitude=%f&longitude=%f&current=temperature_2m,relative_humidity_2m," +
                    "apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day,visibility," +
                    "pressure_msl,uv_index&temperature_unit=celsius&wind_speed_unit=kmh&precision=float",
                    weatherApiBaseUrl, latitude, longitude
            );

            Map<String, Object> response = restTemplate.getForObject(apiUrl, Map.class);
            
            if (response == null || !response.containsKey("current")) {
                log.warn("[weather] Invalid response from Open-Meteo API for {}", city);
                return getDefaultFallbackWeather(city, country, latitude, longitude);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> current = (Map<String, Object>) response.get("current");
            
            @SuppressWarnings("unchecked")
            Map<String, Object> currentUnits = (Map<String, Object>) response.get("current_units");

            return parseWeatherResponse(current, currentUnits, city, country, latitude, longitude);

        } catch (RestClientException ex) {
            log.error("[weather] API call failed for {}: {}", city, ex.getMessage());
            return getDefaultFallbackWeather(city, country, latitude, longitude);
        } catch (Exception ex) {
            log.error("[weather] Unexpected error fetching weather for {}: {}", city, ex.getMessage(), ex);
            return getDefaultFallbackWeather(city, country, latitude, longitude);
        }
    }

    /**
     * Get weather for patient's city using default or provided coordinates
     */
    public WeatherDTO getWeatherForPatient(String patientCity) {
        if (patientCity == null || patientCity.trim().isEmpty()) {
            patientCity = defaultCity;
        }

        String normalized = normalizeCityName(patientCity);

        return switch (normalized) {
            case "TUNIS", "TUNISIE", "TUNISIA", "TUNIS TUNISIE", "TUNIS,TUNISIE", "TUNIS TUNISIA", "TUNIS,TUNISIA", "تونس", "تونس، تونس" ->
                    getCurrentWeather(36.8065, 10.1815, "Tunis", "Tunisie");
            case "SFAX" -> getCurrentWeather(34.7406, 10.7603, "Sfax", "Tunisie");
            case "SOUSSE" -> getCurrentWeather(35.8256, 10.6084, "Sousse", "Tunisie");
            case "ARIANA" -> getCurrentWeather(36.8625, 10.1956, "Ariana", "Tunisie");
            case "BIZERTE" -> getCurrentWeather(37.2744, 9.8739, "Bizerte", "Tunisie");
            default -> getCurrentWeather(defaultLatitude, defaultLongitude, patientCity.trim(), defaultCountry);
        };
    }

    /**
     * Assess weather risk levels based on conditions
     * Returns risk categories: LOW, MEDIUM, HIGH
     */
    public WeatherDTO assessWeatherRisks(WeatherDTO weather) {
        if (weather == null) {
            return null;
        }

        weather.setRainRisk(assessRainRisk(weather.getPrecipitation(), weather.getCondition()));
        weather.setStormRisk(assessStormRisk(weather.getCondition(), weather.getWindSpeed()));
        weather.setTemperatureRisk(assessTemperatureRisk(weather.getTemperature()));
        weather.setWindRisk(assessWindRisk(weather.getWindSpeed()));

        return weather;
    }

    /**
     * Determine if weather conditions require alert generation
     */
    public boolean shouldGenerateAlert(WeatherDTO weather) {
        if (weather == null) {
            return false;
        }

        // Generate alert if any risk is HIGH
        return "HIGH".equals(weather.getRainRisk()) ||
               "HIGH".equals(weather.getStormRisk()) ||
               "HIGH".equals(weather.getTemperatureRisk()) ||
               "HIGH".equals(weather.getWindRisk());
    }

    /**
     * Generate alert title and description based on weather conditions
     */
    public Map<String, String> generateAlertContent(WeatherDTO weather) {
        StringBuilder title = new StringBuilder();
        StringBuilder description = new StringBuilder();
        String recommendation = "Stay safe and monitor the situation.";

        if ("HIGH".equals(weather.getRainRisk())) {
            title.append("Heavy Rain Alert");
            description.append("Heavy rain is expected in your area. ");
            recommendation = "Avoid going outside if possible. Ensure you have an umbrella if you must go out.";
        }

        if ("HIGH".equals(weather.getStormRisk())) {
            if (title.length() > 0) title.append(" - ");
            title.append("Storm/Thunderstorm Alert");
            description.append("A storm or thunderstorm is expected. ");
            recommendation = "Do not go outside. Stay indoors and away from windows.";
        }

        if ("HIGH".equals(weather.getTemperatureRisk())) {
            if (title.length() > 0) title.append(" - ");
            if (weather.getTemperature() < 0) {
                title.append("Extreme Cold Alert");
                description.append(String.format("Extreme cold expected (%.1f°C). ", weather.getTemperature()));
                recommendation = "Dress warmly. Limit outdoor exposure to prevent frostbite.";
            } else {
                title.append("Extreme Heat Alert");
                description.append(String.format("Extreme heat expected (%.1f°C). ", weather.getTemperature()));
                recommendation = "Stay hydrated and avoid prolonged sun exposure.";
            }
        }

        if ("HIGH".equals(weather.getWindRisk())) {
            if (title.length() > 0) title.append(" - ");
            title.append("Strong Wind Warning");
            description.append(String.format("Strong winds expected (%.1f km/h). ", weather.getWindSpeed()));
            recommendation = "Be cautious when going outside. Avoid open areas.";
        }

        if (title.length() == 0) {
            title.append("Weather Update");
            description.append("Weather conditions may change. ");
        }

        description.append("\n\nTemperature: ").append(String.format("%.1f°C", weather.getTemperature()));
        description.append("\nCondition: ").append(weather.getCondition());
        description.append("\nWind Speed: ").append(String.format("%.1f km/h", weather.getWindSpeed()));

        return Map.of(
                "title", title.toString(),
                "description", description.toString(),
                "recommendation", recommendation
        );
    }

    /**
     * Determine severity level based on risks
     */
    public String determineSeverity(WeatherDTO weather) {
        if (weather == null) {
            return "LOW";
        }

        int riskCount = 0;
        int highRiskCount = 0;

        if ("HIGH".equals(weather.getRainRisk())) highRiskCount++;
        if ("MEDIUM".equals(weather.getRainRisk())) riskCount++;

        if ("HIGH".equals(weather.getStormRisk())) highRiskCount++;
        if ("MEDIUM".equals(weather.getStormRisk())) riskCount++;

        if ("HIGH".equals(weather.getTemperatureRisk())) highRiskCount++;
        if ("MEDIUM".equals(weather.getTemperatureRisk())) riskCount++;

        if ("HIGH".equals(weather.getWindRisk())) highRiskCount++;
        if ("MEDIUM".equals(weather.getWindRisk())) riskCount++;

        // If multiple HIGH risks or storm risk, mark as CRITICAL
        if (highRiskCount >= 2 || "HIGH".equals(weather.getStormRisk())) {
            return "CRITICAL";
        }
        // Multiple MEDIUM or HIGH risks
        if (highRiskCount > 0 || riskCount >= 2) {
            return "HIGH";
        }
        // Single MEDIUM risk
        if (riskCount > 0) {
            return "MEDIUM";
        }

        return "LOW";
    }

    // ===== PRIVATE HELPER METHODS =====

    private WeatherDTO parseWeatherResponse(
            Map<String, Object> current,
            Map<String, Object> currentUnits,
            String city,
            String country,
            Double latitude,
            Double longitude) {

        Double temperature = getDoubleValue(current, "temperature_2m");
        Double feelsLike = getDoubleValue(current, "apparent_temperature");
        Integer humidity = getIntValue(current, "relative_humidity_2m");
        Integer weatherCode = getIntValue(current, "weather_code");
        Double windSpeed = getDoubleValue(current, "wind_speed_10m");
        Integer windDirection = getIntValue(current, "wind_direction_10m");
        Boolean isDay = (Boolean) current.get("is_day");
        Double visibility = getDoubleValue(current, "visibility");
        Double precipitation = getDoubleValue(current, "precipitation");
        Integer pressure = getIntValue(current, "pressure_msl");
        Double uvIndex = getDoubleValue(current, "uv_index");

        String weatherCondition = interpretWeatherCode(weatherCode);
        String weatherDescription = getWeatherDescription(weatherCode, isDay);
        String windDirectionName = getWindDirection(windDirection);

        return WeatherDTO.builder()
                .city(city)
            .country(country)
                .latitude(latitude)
                .longitude(longitude)
                .temperature(temperature)
                .feelsLike(feelsLike)
                .humidity(humidity)
                .condition(weatherCondition)
                .description(weatherDescription)
                .windSpeed(windSpeed)
                .windDirection(windDirectionName)
                .precipitation(precipitation)
                .visibility(visibility)
                .pressure(pressure)
                .uvIndex(uvIndex)
                .isDay(isDay)
                .timestamp(LocalDateTime.now())
                .rainRisk("LOW")
                .stormRisk("LOW")
                .temperatureRisk("LOW")
                .windRisk("LOW")
                .build();
    }

    private String normalizeCityName(String city) {
        if (city == null) {
            return "";
        }

        return city
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace('_', ' ')
                .replace('-', ' ')
                .replaceAll("\\s+", " ");
    }

    private String assessRainRisk(Double precipitation, String condition) {
        if (precipitation == null || precipitation == 0) {
            return "LOW";
        }
        if (precipitation > 5) {
            return "HIGH";
        }
        if (precipitation > 2) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String assessStormRisk(String condition, Double windSpeed) {
        if (condition != null && (condition.contains("Thunderstorm") ||
                condition.contains("Storm") || condition.contains("Stormy"))) {
            return "HIGH";
        }
        if (windSpeed != null && windSpeed > 50) {
            return "HIGH";
        }
        if (windSpeed != null && windSpeed > 30) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String assessTemperatureRisk(Double temperature) {
        if (temperature == null) {
            return "LOW";
        }
        // Extreme cold < 0°C or extreme heat > 35°C
        if (temperature < 0 || temperature > 35) {
            return "HIGH";
        }
        // Cold < 5°C or heat > 30°C
        if (temperature < 5 || temperature > 30) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String assessWindRisk(Double windSpeed) {
        if (windSpeed == null || windSpeed == 0) {
            return "LOW";
        }
        if (windSpeed > 50) {
            return "HIGH";
        }
        if (windSpeed > 30) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String interpretWeatherCode(Integer code) {
        if (code == null) return "Unknown";
        
        return switch (code) {
            case 0 -> "Clear Sky";
            case 1, 2 -> "Partly Cloudy";
            case 3 -> "Overcast";
            case 45, 48 -> "Foggy";
            case 51, 53, 55 -> "Drizzle";
            case 61, 63, 65 -> "Rain";
            case 71, 73, 75 -> "Snow";
            case 77 -> "Snow Grains";
            case 80, 81, 82 -> "Rain Showers";
            case 85, 86 -> "Snow Showers";
            case 95, 96, 99 -> "Thunderstorm";
            default -> "Variable";
        };
    }

    private String getWeatherDescription(Integer code, Boolean isDay) {
        String base = interpretWeatherCode(code);
        if (isDay != null && !isDay) {
            base = base + " (Night)";
        }
        return base;
    }

    private String getWindDirection(Integer degrees) {
        if (degrees == null) return "N/A";
        
        return switch (degrees) {
            case 0, 360 -> "N";
            case 45 -> "NE";
            case 90 -> "E";
            case 135 -> "SE";
            case 180 -> "S";
            case 225 -> "SW";
            case 270 -> "W";
            case 315 -> "NW";
            default -> {
                // Calculate nearest cardinal direction
                int normalized = (degrees + 22) % 360;
                int octant = normalized / 45;
                yield switch (octant) {
                    case 0 -> "N";
                    case 1 -> "NE";
                    case 2 -> "E";
                    case 3 -> "SE";
                    case 4 -> "S";
                    case 5 -> "SW";
                    case 6 -> "W";
                    case 7 -> "NW";
                    default -> "N/A";
                };
            }
        };
    }

    private WeatherDTO getDefaultFallbackWeather(String city, String country, Double latitude, Double longitude) {
        log.warn("[weather] Using fallback weather data for {}", city);
        
        return WeatherDTO.builder()
                .city(city)
                .country(country)
                .latitude(latitude)
                .longitude(longitude)
                .temperature(25.0)
                .feelsLike(25.0)
                .humidity(60)
                .condition("Unknown")
                .description("Unable to retrieve weather data")
                .windSpeed(0.0)
                .windDirection("N/A")
                .precipitation(0.0)
                .visibility(10.0)
                .uvIndex(0.0)
                .isDay(true)
                .pressure(1013)
                .timestamp(LocalDateTime.now())
                .rainRisk("LOW")
                .stormRisk("LOW")
                .temperatureRisk("LOW")
                .windRisk("LOW")
                .build();
    }

    @SuppressWarnings("unchecked")
    private Double getDoubleValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return 0.0;
    }

    @SuppressWarnings("unchecked")
    private Integer getIntValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return 0;
    }
}
