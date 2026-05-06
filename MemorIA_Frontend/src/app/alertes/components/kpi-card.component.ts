import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface KpiCardData {
  title: string;
  value: number | string;
  unit?: string;
  icon: string;
  color: 'critical' | 'success' | 'warning' | 'info';
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="rounded-xl bg-white p-5 md:p-6 shadow-sm ring-1 ring-[#C0E0DE]/40 transition-all hover:shadow-md">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="text-3xl">{{ data.icon }}</div>
        <span 
          *ngIf="data.trend"
          class="text-xs font-bold px-2 py-1 rounded-full"
          [ngClass]="getTrendClass()">
          {{ getTrendIcon() }}
        </span>
      </div>

      <!-- Title -->
      <h3 class="text-sm font-semibold text-[#7E7F9A] mb-2">{{ data.title }}</h3>

      <!-- Value -->
      <div class="flex items-baseline gap-2">
        <span class="text-3xl md:text-4xl font-bold" [ngClass]="getColorClass()">
          {{ data.value }}
        </span>
        <span *ngIf="data.unit" class="text-sm font-medium text-[#7E7F9A]">
          {{ data.unit }}
        </span>
      </div>

      <!-- Description -->
      <p *ngIf="data.description" class="text-xs text-[#7E7F9A] mt-3">
        {{ data.description }}
      </p>
    </article>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class KpiCardComponent {
  @Input() data!: KpiCardData;

  getColorClass(): string {
    switch (this.data.color) {
      case 'critical':
        return 'text-[#CB1527]';
      case 'success':
        return 'text-[#00635D]';
      case 'warning':
        return 'text-[#F59E0B]';
      case 'info':
        return 'text-[#541A75]';
      default:
        return 'text-[#541A75]';
    }
  }

  getTrendClass(): string {
    switch (this.data.trend) {
      case 'up':
        return 'bg-[#CB1527]/10 text-[#CB1527]';
      case 'down':
        return 'bg-[#00635D]/10 text-[#00635D]';
      case 'stable':
        return 'bg-[#541A75]/10 text-[#541A75]';
      default:
        return '';
    }
  }

  getTrendIcon(): string {
    switch (this.data.trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'stable':
        return '→';
      default:
        return '';
    }
  }
}
