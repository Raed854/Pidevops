import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface PredictiveAlert {
  title: string;
  probability: number;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

@Component({
  selector: 'app-predictive-alerts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#C0E0DE]/40">
  <div class="flex items-center gap-2 mb-4">
    <span class="text-lg">🔮</span>
    <h3 class="font-semibold text-[#541A75]">Predictive Alerts</h3>
  </div>

  <div class="space-y-3">
    <div 
      *ngFor="let alert of predictiveAlerts"
      class="rounded-lg border p-4"
      [ngClass]="getRiskBorderClass(alert.riskLevel)">
      
      <div class="flex items-start justify-between gap-3 mb-2">
        <div class="flex-1">
          <h4 class="font-semibold text-[#541A75] text-sm">{{ alert.title }}</h4>
          <p class="text-xs text-[#7E7F9A] mt-1">{{ alert.description }}</p>
        </div>
        
        <span 
          class="text-xs font-bold px-2 py-1 rounded-full shrink-0 whitespace-nowrap"
          [ngClass]="getRiskBadgeClass(alert.riskLevel)">
          {{ alert.probability }}%
        </span>
      </div>

      <!-- Probability Bar -->
      <div class="h-2 bg-[#C0E0DE]/20 rounded-full overflow-hidden">
        <div 
          class="h-full transition-all"
          [style.width.%]="alert.probability"
          [style.background-color]="getRiskColor(alert.riskLevel)">
        </div>
      </div>

      <!-- Link to Planning -->
      <a 
        href="/planning"
        class="text-xs text-[#541A75] hover:underline mt-2 block">
        → Open planning
      </a>
    </div>
  </div>
</div>
  `
})
export class PredictiveAlertsComponent {
  @Input() predictiveAlerts: PredictiveAlert[] = [];

  getRiskColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'high': return '#CB1527';
      case 'medium': return '#F59E0B';
      case 'low': return '#00635D';
      default: return '#7E7F9A';
    }
  }

  getRiskBorderClass(riskLevel: string): string {
    switch (riskLevel) {
      case 'high': return 'border-l-4 border-[#CB1527] bg-[#CB1527]/5';
      case 'medium': return 'border-l-4 border-[#F59E0B] bg-[#F59E0B]/5';
      case 'low': return 'border-l-4 border-[#00635D] bg-[#00635D]/5';
      default: return 'border-[#C0E0DE]/40';
    }
  }

  getRiskBadgeClass(riskLevel: string): string {
    switch (riskLevel) {
      case 'high': return 'bg-[#CB1527]/20 text-[#CB1527]';
      case 'medium': return 'bg-[#F59E0B]/20 text-[#F59E0B]';
      case 'low': return 'bg-[#00635D]/20 text-[#00635D]';
      default: return 'bg-[#C0E0DE]/20 text-[#7E7F9A]';
    }
  }
}
