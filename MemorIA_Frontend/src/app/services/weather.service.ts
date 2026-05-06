import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { WeatherCurrent } from '../models/alert.model';
import { environment } from '../../environments/environment';

/**
 * Service météo pour Tunis, Tunisie
 * Utilise l'endpoint backend qui appelle Open-Meteo API
 */
@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly apiUrl = `${environment.apiUrl}/api/alerts/weather/tunis`;

  constructor(private http: HttpClient) {}

  getTunisWeather(): Observable<WeatherCurrent> {
    return this.getCurrentTunisWeather();
  }

  /**
   * Retourne la météo actuelle de Tunis en temps réel via endpoint backend
   */
  getCurrentTunisWeather(): Observable<WeatherCurrent> {
    console.log('[WeatherService] Appel endpoint backend:', this.apiUrl);

    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        console.log('[WeatherService] Réponse API brute:', response);
        const weather = this.parseOpenMeteoResponse(response);
        console.log('[WeatherService] Données météo parsées:', weather);
        return weather;
      }),
      catchError(error => {
        console.error('[WeatherService] Erreur lors du chargement de la météo:', error);
        return of(this.getDefaultWeather());
      })
    );
  }

  /**
   * Parse la réponse Open-Meteo et la convertit au format WeatherCurrent
   */
  private parseOpenMeteoResponse(response: any): WeatherCurrent {
    const current = response?.current;
    
    if (!current) {
      console.warn('[WeatherService] Pas de données current dans la réponse');
      return this.getDefaultWeather();
    }

    const temperature = Math.round(current.temperature_2m ?? 24);
    const humidity = current.relative_humidity_2m ?? 50;
    const windSpeed = Math.round(current.wind_speed_10m ?? 0);
    const weatherCode = current.weather_code ?? 0;

    const { condition, description, icon, dangerLevel } = this.getWeatherDetails(
      weatherCode,
      temperature,
      humidity,
      windSpeed
    );

    return {
      temperature,
      condition,
      description,
      icon,
      dangerLevel,
      updatedAt: new Date().toISOString(),
      humidity,
      windSpeed
    };
  }

  /**
   * Mappe les codes météo WMO aux descriptions et niveaux de danger
   * Référence: https://www.open-meteo.com/en/docs
   */
  private getWeatherDetails(
    code: number,
    temp: number,
    humidity: number,
    windSpeed: number
  ): {
    condition: string;
    description: string;
    icon: string;
    dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  } {
    let condition = 'Clear';
    let description = 'Conditions météo stable';
    let icon = '☀️';
    let dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    // Codes WMO (World Meteorological Organization)
    if (code === 0) {
      condition = 'Dégagé';
      description = 'Ciel clair';
      icon = '☀️';
      dangerLevel = 'LOW';
    } else if (code === 1 || code === 2) {
      condition = 'Partiellement nuageux';
      description = 'Principalement dégagé';
      icon = '⛅';
      dangerLevel = 'LOW';
    } else if (code === 3) {
      condition = 'Nuageux';
      description = 'Ciel nuageux';
      icon = '☁️';
      dangerLevel = 'LOW';
    } else if (code === 45 || code === 48) {
      condition = 'Brumeux';
      description = 'Brume ou brouillard';
      icon = '🌫️';
      dangerLevel = 'MEDIUM';
    } else if (code === 51 || code === 53 || code === 55) {
      condition = 'Pluie légère';
      description = 'Pluie légère ou légère averse';
      icon = '🌧️';
      dangerLevel = 'MEDIUM';
    } else if (code === 61 || code === 63 || code === 65) {
      condition = 'Pluie modérée';
      description = 'Pluie modérée ou averses';
      icon = '🌧️';
      dangerLevel = 'MEDIUM';
    } else if (code === 71 || code === 73 || code === 75) {
      condition = 'Neige';
      description = 'Chutes de neige';
      icon = '❄️';
      dangerLevel = 'HIGH';
    } else if (code === 77) {
      condition = 'Neige en grains';
      description = 'Neige en grains';
      icon = '❄️';
      dangerLevel = 'HIGH';
    } else if (code === 80 || code === 81 || code === 82) {
      condition = 'Averse';
      description = 'Pluies violentes';
      icon = '⛈️';
      dangerLevel = 'HIGH';
    } else if (code === 85 || code === 86) {
      condition = 'Averse de neige';
      description = 'Averse de neige';
      icon = '❄️';
      dangerLevel = 'HIGH';
    } else if (code === 95 || code === 96 || code === 99) {
      condition = 'Orage';
      description = 'Orage avec ou sans grêle';
      icon = '⛈️';
      dangerLevel = 'HIGH';
    }

    // Ajuster le danger selon la température
    if (temp > 35) {
      dangerLevel = 'HIGH';
      description += ' - Chaleur extrême ⚠️';
    } else if (temp < 0) {
      dangerLevel = 'HIGH';
      description += ' - Gel ⚠️';
    } else if (temp > 30) {
      if (dangerLevel === 'LOW') dangerLevel = 'MEDIUM';
      description += ' - Très chaud';
    }

    // Augmenter le danger selon le vent
    if (windSpeed > 50) {
      dangerLevel = 'HIGH';
      description += ' - Vents violents ⚠️';
    } else if (windSpeed > 30) {
      if (dangerLevel === 'LOW') dangerLevel = 'MEDIUM';
      description += ' - Vents forts';
    }

    // Augmenter le danger selon l'humidité
    if (humidity > 90) {
      description += ' - Très humide';
    }

    return { condition, description, icon, dangerLevel };
  }

  /**
   * Météo par défaut en cas d'erreur
   */
  private getDefaultWeather(): WeatherCurrent {
    return {
      temperature: 24,
      condition: 'Ensoleillé',
      description: 'Données météo indisponibles - Affichage par défaut',
      icon: '☀️',
      dangerLevel: 'LOW',
      updatedAt: new Date().toISOString()
    };
  }
}
