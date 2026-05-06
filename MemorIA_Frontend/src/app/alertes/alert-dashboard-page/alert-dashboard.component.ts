import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Alert, AlertDashboard } from '../../models/alert.model';

interface DashboardMetric {
  label: string;
  value: number;
  suffix: string;
  icon: string;
  color: string;
  bgColor: string;
}

@Component({
  selector: 'app-alert-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Card 1: Total Unresolved Alerts -->
      <div class="rounded-lg border border-[#C0E0DE]/40 bg-gradient-to-br from-[#f8fbfb] to-white p-5 shadow-sm ring-1 ring-[#C0E0DE]/20">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-[#7E7F9A]">Total Non Traitées</p>
            <p class="mt-2 text-3xl font-bold text-[#541A75]">{{ totalUnresolved }}</p>
            <p class="mt-1 text-xs text-[#7E7F9A]">en attente d'action</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[#C0E0DE]/30 text-lg">
            ⚠️
          </div>
        </div>
      </div>

      <!-- Card 2: Critical Alerts Today -->
      <div class="rounded-lg border-2 border-[#CB1527]/40 bg-gradient-to-br from-[#FEF2F2] to-white p-5 shadow-sm ring-1 ring-[#CB1527]/20">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-[#CB1527]">Critiques Aujourd'hui</p>
            <p class="mt-2 text-3xl font-bold text-[#CB1527]">{{ criticalToday }}</p>
            <p class="mt-1 text-xs text-[#7E7F9A]">action immédiate requise</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[#CB1527]/20 text-lg">
            🔴
          </div>
        </div>
      </div>

      <!-- Card 3: 24h Resolution Rate -->
      <div class="rounded-lg border border-[#C0E0DE]/40 bg-gradient-to-br from-[#F0FFFE] to-white p-5 shadow-sm ring-1 ring-[#00635D]/20">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-[#7E7F9A]">Taux Résolution 24h</p>
            <p class="mt-2 text-3xl font-bold text-[#00635D]">{{ resolutionRate }}%</p>
            <p class="mt-1 text-xs text-[#7E7F9A]">alertes résolues dans le délai</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[#00635D]/20 text-lg">
            ✅
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AlertDashboardComponent implements OnChanges {
  @Input() alerts: Alert[] = [];
  @Input() dashboard: AlertDashboard | null = null;

  totalUnresolved = 0;
  criticalToday = 0;
  resolutionRate = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['alerts'] || changes['dashboard']) {
      this.calculateMetrics();
    }
  }

  private calculateMetrics(): void {
    // Unresolved alerts
    this.totalUnresolved = this.alerts.filter(a => a.status !== 'RESOLVED').length;

    // Critical alerts today (created today + severity CRITICAL)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.criticalToday = this.alerts.filter(a => {
      const alertDate = new Date(a.createdAt);
      alertDate.setHours(0, 0, 0, 0);
      return alertDate.getTime() === today.getTime() && a.severity === 'CRITICAL';
    }).length;

    // Resolution rate from dashboard or approximate from alerts
    if (this.dashboard) {
      this.resolutionRate = Math.round(this.dashboard.resolutionRate) || 0;
    } else {
      const resolved = this.alerts.filter(a => a.status === 'RESOLVED').length;
      this.resolutionRate = this.alerts.length > 0 ? Math.round((resolved / this.alerts.length) * 100) : 0;
    }
  }
}
