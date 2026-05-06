import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Alert } from '../../models/alert.model';

@Component({
  selector: 'app-alert-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article
      class="rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md"
      [ngClass]="alert.severity === 'CRITICAL' ? 'border-l-4 border-[#CB1527]' : alert.severity === 'HIGH' ? 'border-l-4 border-[#F59E0B]' : 'border-[#C0E0DE]/40'">

      <div class="flex items-start gap-3">
        <!-- Icon -->
        <div 
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
          [ngStyle]="{ 'background-color': getSeverityColor() + '20' }">
          {{ getIcon() }}
        </div>

        <!-- Content -->
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2 mb-1">
            <h4 class="font-semibold text-[#541A75] line-clamp-1">{{ alert.title }}</h4>
            <span 
              class="text-xs font-semibold px-2 py-1 rounded-full shrink-0 whitespace-nowrap"
              [ngStyle]="{ 'background-color': getSeverityColor() + '20', 'color': getSeverityColor() }">
              {{ alert.severity }}
            </span>
          </div>

          <p class="text-xs text-[#7E7F9A] mb-2">{{ alert.createdAt | date: 'short' }}</p>
          <p class="text-sm text-slate-700 line-clamp-2">{{ alert.description }}</p>

          <!-- Quick Actions (compact) -->
          <div class="mt-3 flex flex-wrap gap-1">
            <button
              (click)="onAction('take-charge')"
              type="button"
              class="rounded px-2 py-1 text-xs font-semibold text-white bg-[#541A75] hover:bg-[#6a2a8f] transition">
              Take in Charge
            </button>
            <button
              (click)="onAction('resolve')"
              type="button"
              class="rounded px-2 py-1 text-xs font-semibold text-white bg-[#00635D] hover:bg-[#00786d] transition">
              Resolve
            </button>
          </div>
        </div>
      </div>
    </article>
  `,
  styles: []
})
export class AlertCardComponent {
  @Input() alert!: Alert;
  @Output() actionTriggered = new EventEmitter<{ action: string; alertId: number }>();

  getIcon(): string {
    switch (this.alert.severity) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MEDIUM': return '📋';
      case 'LOW': return 'ℹ️';
      default: return '📌';
    }
  }

  getSeverityColor(): string {
    switch (this.alert.severity) {
      case 'CRITICAL': return '#CB1527';
      case 'HIGH': return '#F59E0B';
      case 'MEDIUM': return '#541A75';
      case 'LOW': return '#00635D';
      default: return '#7E7F9A';
    }
  }

  onAction(action: string): void {
    this.actionTriggered.emit({ action, alertId: this.alert.id });
  }
}
