import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Alert } from '../../models/alert.model';

interface KPI {
  label: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  status: string;
}

@Component({
  selector: 'app-alert-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <!-- Total Unresolved -->
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#C0E0DE]/40">
        <p class="text-xs uppercase tracking-widest text-[#7E7F9A]">Total Unresolved</p>
        <p class="mt-2 text-5xl font-extrabold text-[#541A75]">{{ unresolvedCount }}</p>
        <p class="mt-2 text-xs" [ngClass]="unresolvedCount === 0 ? 'text-[#00635D]' : unresolvedCount <= 3 ? 'text-[#541A75]' : 'text-[#CB1527]'">
          <span *ngIf="unresolvedCount === 0" class="font-semibold">✓ None</span>
          <span *ngIf="unresolvedCount > 0 && unresolvedCount <= 3" class="font-semibold">Normal</span>
          <span *ngIf="unresolvedCount > 3" class="font-semibold">⚠ Elevated</span>
        </p>
      </div>

      <!-- Critical Alerts -->
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#CB1527]/30 border-l-4 border-[#CB1527]">
        <p class="text-xs uppercase tracking-widest text-[#7E7F9A]">Critical Alerts</p>
        <p class="mt-2 text-5xl font-extrabold text-[#CB1527]">{{ criticalCount }}</p>
        <p class="mt-2 text-xs text-[#CB1527] font-semibold">Requires immediate attention</p>
      </div>

      <!-- Resolution Rate -->
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#C0E0DE]/40">
        <p class="text-xs uppercase tracking-widest text-[#7E7F9A]">Resolution Rate</p>
        <p class="mt-2 text-5xl font-extrabold" [ngClass]="resolutionRateClass">{{ resolutionRate }}%</p>
        <p class="mt-2 text-xs font-semibold" [ngClass]="resolutionRateClass">
          {{ resolutionRate >= 80 ? '✓ Excellent' : resolutionRate < 60 ? '⚠ Needs focus' : '→ Stable' }}
        </p>
      </div>
    </div>
  `,
  styles: []
})
export class AlertDashboardComponent {
  @Input() alerts: Alert[] = [];
  @Input() resolutionRate: number = 0;

  get unresolvedCount(): number {
    return this.alerts.filter(a => a.status !== 'RESOLVED').length;
  }

  get criticalCount(): number {
    return this.alerts.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
  }

  get resolutionRateClass(): string {
    if (this.resolutionRate >= 80) return 'text-[#00635D]';
    if (this.resolutionRate < 60) return 'text-[#CB1527]';
    return 'text-[#541A75]';
  }
}
