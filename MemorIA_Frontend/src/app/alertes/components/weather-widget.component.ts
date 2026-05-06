import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { WeatherCurrent } from '../../models/alert.model';

@Component({
  selector: 'app-weather-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      class="rounded-2xl border p-4 md:p-5 shadow-sm"
      [ngClass]="cardClass"
      role="status"
      aria-live="polite"
      aria-label="Current weather and weather guidance">

      <div class="flex items-start gap-3">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
          [ngClass]="iconBoxClass">
          {{ weather?.icon || '🌤️' }}
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-[#7E7F9A]">{{ title }}</h3>
            <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" [ngClass]="badgeClass">
              {{ dangerLabel }}
            </span>
            <span class="text-xs text-[#7E7F9A]" *ngIf="weather && weather.updatedAt">
              {{ 'Mis à jour: ' + formatUpdateTime(weather.updatedAt) }}
            </span>
          </div>

          <div *ngIf="!loading && weather; else loadingOrEmpty" class="mt-2 space-y-2">
            <p class="text-3xl font-bold text-[#541A75]">{{ weather.temperature }}°C</p>
            <p class="text-sm font-semibold text-[#00635D]">{{ weather.condition }}</p>
            <p class="text-sm text-[#7E7F9A]">{{ weather.description }}</p>
            
            <!-- Détails additionnels -->
            <div class="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-[#C0E0DE]/25">
              <div *ngIf="weather.humidity !== undefined" class="text-xs">
                <span class="text-[#7E7F9A]">💧 Humidité:</span>
                <p class="font-semibold text-[#541A75]">{{ weather.humidity }}%</p>
              </div>
              <div *ngIf="weather.windSpeed !== undefined" class="text-xs">
                <span class="text-[#7E7F9A]">💨 Vent:</span>
                <p class="font-semibold text-[#541A75]">{{ weather.windSpeed }} km/h</p>
              </div>
            </div>
          </div>

          <ng-template #loadingOrEmpty>
            <div *ngIf="loading" class="mt-2 space-y-2 animate-pulse">
              <div class="h-6 w-24 rounded bg-[#C0E0DE]/40"></div>
              <div class="h-4 w-40 rounded bg-[#C0E0DE]/30"></div>
            </div>
            <p *ngIf="!loading" class="mt-2 text-sm text-[#7E7F9A]">
              Les informations météo ne sont pas disponibles en ce moment.
            </p>
          </ng-template>
        </div>
      </div>
    </section>
  `
})
export class WeatherWidgetComponent {
  @Input() weather: WeatherCurrent | null = null;
  @Input() loading = false;
  @Input() title = 'Weather Conditions';
  @Input() emphasis: 'patient' | 'caregiver' | 'doctor' = 'patient';

  get isDangerous(): boolean {
    return this.weather?.dangerLevel === 'HIGH';
  }

  get cardClass(): string {
    if (this.isDangerous) {
      return 'border-[#CB1527]/40 bg-[#fff5f7]';
    }
    if (this.emphasis === 'doctor' || this.emphasis === 'caregiver') {
      return 'border-[#541A75]/20 bg-[#f8f6fb]';
    }
    return 'border-[#C0E0DE]/50 bg-white';
  }

  get iconBoxClass(): string {
    return this.isDangerous
      ? 'bg-[#CB1527]/15 text-[#CB1527]'
      : 'bg-[#541A75]/10 text-[#541A75]';
  }

  get badgeClass(): string {
    if (this.isDangerous) {
      return 'bg-[#CB1527] text-white';
    }
    if (this.weather?.dangerLevel === 'MEDIUM') {
      return 'bg-[#541A75]/10 text-[#541A75]';
    }
    return 'bg-[#00635D]/10 text-[#00635D]';
  }

  get dangerLabel(): string {
    if (!this.weather) {
      return 'Pas de données';
    }
    if (this.weather.dangerLevel === 'HIGH') {
      return 'Vigilance élevée ⚠️';
    }
    if (this.weather.dangerLevel === 'MEDIUM') {
      return 'Vigilance modérée';
    }
    return 'Risque faible';
  }

  formatUpdateTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);
      
      if (diffMins < 1) return 'à l\'instant';
      if (diffMins < 60) return `il y a ${diffMins}m`;
      
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `il y a ${diffHours}h`;
      
      return date.toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'récemment';
    }
  }
}
