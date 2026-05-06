# MemoriA Weather Integration Implementation Guide

## Overview

Complete weather integration and weather-related alert system for MemoriA. This implementation provides:

- **Real-time weather data** from Open-Meteo API (free, no authentication required)
- **Automatic alert generation** based on dangerous weather conditions
- **Scheduled daily checks** at 7 AM for all patients
- **Risk assessment** for rain, storms, temperature, and wind
- **Patient-specific weather alerts** with personalized recommendations

## Architecture

### 1. Data Flow

```
OpenMeteo API
    ↓
WeatherService (fetches & assesses)
    ↓
AlertService (generates alerts)
    ↓
Alert Entity + WeatherAlertResponseDTO
    ↓
WeatherController / AlertController (returns to clients)
```

### 2. Components

#### DTOs
- **WeatherDTO** - Current weather data with risk assessments
- **WeatherAlertRequestDTO** - Manual weather alert creation request
- **WeatherAlertResponseDTO** - Weather alert response with full details

#### Services
- **WeatherService** - Open-Meteo API integration, weather assessment, risk analysis
- **AlertService** - Enhanced with weather alert generation methods

#### Controllers
- **WeatherController** - REST endpoints for weather operations
- **AlertController** - Enhanced with weather-related endpoints

#### Repositories
- **AlertRepository** - Added `findByPatientIdAndTypeOrderByCreatedAtDesc()` method

#### Entities
- **AlertType** - Added `WEATHER` enum value
- **Alert** - Uses existing structure, no modifications needed

#### Schedulers
- **WeatherAlertScheduler** - Daily (7 AM) + periodic (every 3 hours) weather checks

## API Endpoints

### 1. GET /api/weather/current

Returns current weather for a patient's city (default: Tunis)

**Parameters:**
- `patientCity` (optional, query param) - City name. Defaults to "Tunis"

**Response:**
```json
{
  "city": "Tunis",
  "country": "Tunisia",
  "latitude": 36.8065,
  "longitude": 10.1686,
  "temperature": 28.5,
  "feels_like": 29.0,
  "humidity": 65,
  "condition": "Rainy",
  "description": "Rain",
  "icon": "rain",
  "wind_speed": 15.3,
  "wind_direction": "N",
  "precipitation": 5.2,
  "visibility": 8.5,
  "uv_index": 6.5,
  "pressure": 1013,
  "timestamp": "2026-04-15T14:30:00",
  "is_day": true,
  "rain_risk": "HIGH",
  "storm_risk": "LOW",
  "temperature_risk": "LOW",
  "wind_risk": "LOW"
}
```

**Example:**
```bash
curl -X GET "http://localhost:8089/api/weather/current?patientCity=Tunis"
```

---

### 2. GET /api/weather/alerts/{patientId}

Returns all weather-related alerts for a patient

**Parameters:**
- `patientId` (path param, required) - Patient ID

**Response:**
```json
[
  {
    "id": 42,
    "patient_id": 3,
    "patient_name": "John Doe",
    "title": "Heavy Rain Alert",
    "description": "Heavy rain is expected in your area...",
    "severity": "HIGH",
    "status": "UNREAD",
    "type": "WEATHER",
    "weather_condition": "Rainy",
    "temperature": 22.5,
    "wind_speed": 25.0,
    "precipitation": 8.5,
    "recommendation": "Avoid going outside if possible.",
    "is_read": false,
    "is_critical": false,
    "gravity_score": 50,
    "auto_generated": true,
    "created_at": "2026-04-15T07:15:00",
    "updated_at": "2026-04-15T07:15:00"
  }
]
```

**Example:**
```bash
curl -X GET "http://localhost:8089/api/weather/alerts/3"
```

---

### 3. POST /api/weather/generate

Manually trigger weather alert generation

**Request Body (optional):**
```json
{
  "patient_id": 3,
  "patient_city": "Tunis"
}
```

If `patient_id` is null/omitted, generates alerts for ALL patients.

**Response:**
```json
{
  "success": true,
  "alerts_generated": 5,
  "message": "Generated 5 weather alert(s)",
  "timestamp": 1713186600000
}
```

**Example:**
```bash
# Generate for specific patient
curl -X POST "http://localhost:8089/api/weather/generate" \
  -H "Content-Type: application/json" \
  -d '{"patient_id": 3, "patient_city": "Tunis"}'

# Generate for all patients
curl -X POST "http://localhost:8089/api/weather/generate"
```

---

### 4. GET /api/weather/health

Health check endpoint - verifies weather service connectivity

**Response:**
```json
{
  "status": "UP",
  "service": "WeatherService",
  "last_check": 1713186600000,
  "weather_condition": "Rainy"
}
```

**Example:**
```bash
curl -X GET "http://localhost:8089/api/weather/health"
```

## Weather Alert Triggers

Alerts are generated when ANY of these conditions are met:

### Rain Risk (HIGH)
- Precipitation > 5mm
- Alert Title: "Heavy Rain Alert"
- Recommendation: "Avoid going outside if possible"

### Storm/Thunderstorm Risk (HIGH)
- Weather code indicates thunderstorm/storm
- Wind speed > 50 km/h
- Alert Title: "Storm/Thunderstorm Alert"
- Recommendation: "Do not go outside. Stay indoors"
- **Severity: CRITICAL** (automatic escalation)

### Temperature Risk (HIGH)
- Temperature < 0°C (Extreme Cold)
  - Alert: "Extreme Cold Alert"
  - Recommendation: "Dress warmly, limit outdoor exposure"
- Temperature > 35°C (Extreme Heat)
  - Alert: "Extreme Heat Alert"
  - Recommendation: "Stay hydrated, avoid sun exposure"

### Wind Risk (HIGH)
- Wind speed > 50 km/h
- Alert Title: "Strong Wind Warning"
- Recommendation: "Be cautious going outside"

## Scheduled Tasks

### Task 1: Daily Weather Alert Generation
- **Cron:** `0 0 7 * * *` (Every day at 07:00:00)
- **Function:** Checks weather for all patients, generates alerts for severe conditions
- **Logs:** `[weather-scheduler] Daily weather alert generation...`

### Task 2: Periodic Weather Alert Check
- **Cron:** `0 0 */3 * * *` (Every 3 hours)
- **Function:** Real-time responsiveness for unpredictable weather changes
- **Note:** Can be disabled by removing method or using `@ConditionalOnProperty`

### Task 3: Weather Service Health Check
- **Cron:** `0 */30 * * * *` (Every 30 minutes)
- **Function:** Verifies API connectivity, logs warnings if service unavailable

## Configuration

### application.properties

```properties
# Weather API Configuration (Open-Meteo)
weather.api.base-url=https://api.open-meteo.com/v1/forecast
weather.default.city=Tunis
weather.default.latitude=36.8065
weather.default.longitude=10.1686

# RestTemplate Timeouts
# Connect timeout: 5 seconds
# Read timeout: 10 seconds
```

### Spring Scheduling

Scheduling is enabled by default via `@EnableScheduling` on `WeatherAlertScheduler`.

To disable scheduling globally:
```properties
spring.task.scheduling.enabled=false
```

## Key Features

### 1. Open-Meteo Integration
- **Free API** - No authentication required
- **No Rate Limiting** for reasonable usage
- **Comprehensive Data** - Temperature, humidity, wind, precipitation, etc.
- **Multiple Parameters** - Current conditions + hourly/daily forecasts

### 2. Risk Assessment
```
Rain Risk:      LOW (0mm) → MEDIUM (2-5mm) → HIGH (>5mm)
Storm Risk:     LOW → HIGH (thunderstorm or wind >50 km/h)
Temp Risk:      LOW (5-30°C) → MEDIUM (<5 or >30°C) → HIGH (<0 or >35°C)
Wind Risk:      LOW (0-30 km/h) → MEDIUM (30-50 km/h) → HIGH (>50 km/h)
```

### 3. Gravity Score Calculation
- **Storm** = +50 points
- **Extreme Temperature** = +30 points
- **Heavy Rain** = +20 points
- **Strong Wind** = +15 points
- Each MEDIUM risk = +10 points
- **Max Score:** 100

### 4. Severity Mapping
- **CRITICAL:** Storm + ANY other HIGH risk, or 2+ HIGH risks
- **HIGH:** 1 HIGH risk or 2+ MEDIUM risks
- **MEDIUM:** 1-2 MEDIUM risks
- **LOW:** No significant risks

### 5. Duplicate Prevention
- Source key format: `WEATHER:{patientId}:{date}`
- Prevents duplicate alerts for same weather on same day

## Database Queries

### Finding Weather Alerts
```sql
SELECT * FROM alerts 
WHERE patient_id = ? 
AND type = 'WEATHER' 
ORDER BY created_at DESC;
```

### Alert Statistics
```sql
SELECT COUNT(*) FROM alerts 
WHERE patient_id = ? AND type = 'WEATHER' AND status != 'RESOLVED';
```

## Error Handling

### API Failures
- **Graceful degradation** - Returns fallback weather data
- **Logging** - All errors logged at WARN/ERROR level
- **Timeout Protection** - RestTemplate configured with 5s connect, 10s read timeouts
- **User Feedback** - HTTP 503 if weather service unavailable

### Common Errors

| HTTP Status | Scenario | Response |
|---|---|---|
| 400 | Missing required parameters | "Valid patient ID is required" |
| 404 | Patient not found | "Patient not found" |
| 503 | Weather API unavailable | "Unable to fetch weather data" |
| 500 | Unexpected error | "Unable to fetch weather alerts" |

## Logging

All weather operations logged with prefix `[weather-...]`:

```
[weather] Fetching weather for Tunis: lat=36.8065, lon=10.1686
[weather] Weather data retrieved for Tunis: condition=Rainy, temp=28.5°C
[weather-scheduler] Starting daily weather alert generation task
[weather-scheduler] Daily weather alert generation completed. Generated 12 alerts
[weather-controller] GET /current city=Tunis
[weather-alerts] Generating weather alert for patientId=3 condition=Rainy
[weather-alerts] Weather alert 42 created for patientId=3 severity=HIGH
```

## Testing

### Manual Testing

1. **Test current weather endpoint:**
```bash
curl "http://localhost:8089/api/weather/current?patientCity=Tunis"
```

2. **Test weather alerts for patient:**
```bash
curl "http://localhost:8089/api/weather/alerts/3"
```

3. **Trigger alert generation:**
```bash
curl -X POST "http://localhost:8089/api/weather/generate" \
  -H "Content-Type: application/json" \
  -d '{"patient_id": 3}'
```

4. **Health check:**
```bash
curl "http://localhost:8089/api/weather/health"
```

### Database Verification

```sql
-- Check generated weather alerts
SELECT id, patient_id, title, severity, status, created_at 
FROM alerts 
WHERE type = 'WEATHER' 
ORDER BY created_at DESC LIMIT 10;

-- Count weather alerts by severity
SELECT severity, COUNT(*) as count 
FROM alerts 
WHERE type = 'WEATHER' 
GROUP BY severity;

-- Check alert source keys (prevent duplicates)
SELECT source_key, COUNT(*) 
FROM alerts 
WHERE type = 'WEATHER' 
GROUP BY source_key;
```

## Performance Considerations

### REST Template Configuration
- **Connection Pool:** Default (configurable in RestTemplateBuilder)
- **Timeouts:** 5s connect, 10s read (prevent hanging)
- **Retry:** Not implemented (can be added via Resilience4j)

### Database Queries
- **Indexes:** Alert table indexed on (patient_id, type, created_at)
- **Fetch Strategy:** LEFT JOIN FETCH for relations (N+1 prevention)
- **Pagination:** Not implemented (can limit to recent 100 alerts)

### Scheduled Task Optimization
- **Parallel Processing:** Currently sequential per patient
- **Batch Size:** No batching (each patient processed individually)
- **Caching:** No caching (data freshness prioritized)

## Future Enhancements

1. **Geocoding Integration**
   - Convert patient city names to coordinates via Google Maps API
   - Enable accurate location-based weather

2. **Weather Forecasting**
   - Predictive alerts for tomorrow's weather
   - 7-day forecast display
   - Risk trend analysis

3. **Multiple Weather APIs**
   - Fallback to WeatherAPI, AccuWeather if Open-Meteo unavailable
   - Hybrid approach for redundancy

4. **Patient Preferences**
   - Configurable alert thresholds per patient
   - Health-specific conditions (e.g., asthma triggers on pollen count)
   - Medication interactions with weather

5. **Advanced Analytics**
   - Correlation between weather and patient health events
   - Seasonal pattern analysis
   - Predictive health alerts based on weather

6. **Mobile Notifications**
   - Push notifications for critical weather alerts
   - SMS alerts for elderly patients
   - In-app weather widget

## Dependencies

```xml
<!-- Already Included in Spring Boot Starter Web -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<!-- RestTemplate configured in JacksonConfig -->
```

## File Structure

```
src/main/java/MemorIA/
├── service/
│   ├── WeatherService.java          (NEW - Open-Meteo integration)
│   └── AlertService.java            (MODIFIED - Added weather methods)
├── controller/
│   ├── WeatherController.java       (NEW - Weather endpoints)
│   └── AlertController.java         (Existing - can use weather endpoints)
├── dto/
│   ├── WeatherDTO.java              (NEW - Weather data)
│   ├── WeatherAlertRequestDTO.java  (NEW - Request payload)
│   └── WeatherAlertResponseDTO.java (NEW - Response payload)
├── scheduler/
│   ├── WeatherAlertScheduler.java   (NEW - Daily + periodic tasks)
│   └── AlertScheduler.java          (Existing)
├── repository/
│   └── AlertRepository.java         (MODIFIED - Added type finder)
├── entity/
│   └── alerts/
│       ├── Alert.java               (Existing - no changes)
│       ├── AlertType.java           (MODIFIED - Added WEATHER)
│       └── AlertRecipient.java      (Existing)
└── config/
    └── JacksonConfig.java           (MODIFIED - Added RestTemplate bean)
```

## Compilation & Deployment

### Build
```bash
.\mvnw.cmd clean compile -DskipTests -q
.\mvnw.cmd clean package -DskipTests -q
```

### Run
```bash
java -jar target/demo-0.0.1-SNAPSHOT.jar
```

### Verify
```bash
# Check logs for scheduler startup
# Should see: "[weather-scheduler] Performing weather service health check"

# Test endpoint
curl "http://localhost:8089/api/weather/current"
```

## Troubleshooting

### Problem: Scheduler Not Running
**Solution:** Ensure `@EnableScheduling` is on main class or scheduler component. Check logs for `@EnableScheduling` messages.

### Problem: 503 Weather Service Unavailable
**Solution:** Check internet connectivity. Verify Open-Meteo API is accessible. Check for recent API changes in documentation.

### Problem: Duplicate Alerts Generated
**Solution:** Verify `sourceKey` is being set correctly. Check database for duplicate records and clean up manually if needed.

### Problem: Alerts Not Showing for Patient
**Solution:** Verify patient ID is correct. Check if CaregiverLink exists for the caregiver. Verify permissions in security config.

## Summary

✅ **Complete Implementation** of weather integration with:
- Free Open-Meteo API (no authentication)
- Automatic daily alert generation
- Risk assessment and severity mapping
- Comprehensive error handling
- Production-ready logging
- Flexible scheduling (daily + periodic)
- Clean REST API endpoints
