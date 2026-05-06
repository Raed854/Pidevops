import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Composant KPI pour le dashboard accompagnant
 * Affiche 3 cartes KPI: Alertes aujourd'hui, Critiques non traitées, Taux de confirmation
 */
@Component({
  selector: 'app-alert-dashboard-kpi',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <!-- KPI 1: Alertes aujourd'hui -->
      <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#C0E0DE]/40">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs uppercase tracking-widest text-[#7E7F9A]">Alerts Today</p>
            <p class="mt-2 text-5xl font-extrabold text-[#541A75]">
              {{ todayAlertsCount }}
            </p>
            <p class="mt-2 text-sm text-[#7E7F9A]">
              <span *ngIf="todayAlertsCount === 0" class="text-[#00635D]">✓ No alerts</span>
              <span *ngIf="todayAlertsCount > 0 && todayAlertsCount <= 3" class="text-[#541A75]">Normal level</span>
              <span *ngIf="todayAlertsCount > 3" class="text-[#CB1527]">⚠ Elevated activity</span>
            </p>
          </div>
          <div class="text-4xl">🔔</div>
        </div>
      </div>

      <!-- KPI 2: Alertes critiques non traitées -->
      <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#C0E0DE]/40">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs uppercase tracking-widest text-[#7E7F9A]">Unresolved Critical</p>
            <p class="mt-2 text-5xl font-extrabold" [ngClass]="criticalCountColorClass">
              {{ criticalUnresolvedCount }}
            </p>
            <p class="mt-2 text-sm" [ngClass]="criticalCountColorText">
              <span *ngIf="criticalUnresolvedCount === 0">✓ All clear</span>
              <span *ngIf="criticalUnresolvedCount > 0">Require action</span>
            </p>
          </div>
          <div class="text-4xl">🚨</div>
        </div>
      </div>

      <!-- KPI 3: Taux de confirmation rappels cette semaine -->
      <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#C0E0DE]/40">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs uppercase tracking-widest text-[#7E7F9A]">Weekly Confirmation</p>
            <p class="mt-2 text-5xl font-extrabold" [ngClass]="confirmationRateColorClass">
              {{ weeklyReminderConfirmationRate }}%
            </p>
            <p class="mt-2 text-sm" [ngClass]="confirmationRateColorText">
              <span *ngIf="weeklyReminderConfirmationRate >= 80">Excellent adherence</span>
              <span *ngIf="weeklyReminderConfirmationRate >= 60 && weeklyReminderConfirmationRate < 80">Good adherence</span>
              <span *ngIf="weeklyReminderConfirmationRate < 60">Needs attention</span>
            </p>
          </div>
          <div class="text-4xl">✓</div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AlertDashboardKpiComponent {
  @Input() todayAlertsCount = 0;
  @Input() criticalUnresolvedCount = 0;
  @Input() weeklyReminderConfirmationRate = 85;

  get criticalCountColorClass(): string {
    return this.criticalUnresolvedCount === 0 ? 'text-[#00635D]' : 'text-[#CB1527]';
  }

  get criticalCountColorText(): string {
    return this.criticalUnresolvedCount === 0 ? 'text-[#00635D]' : 'text-[#CB1527]';
  }

  get confirmationRateColorClass(): string {
    if (this.weeklyReminderConfirmationRate >= 80) {
      return 'text-[#00635D]';
    } else if (this.weeklyReminderConfirmationRate >= 60) {
      return 'text-[#541A75]';
    }
    return 'text-[#CB1527]';
  }

  get confirmationRateColorText(): string {
    if (this.weeklyReminderConfirmationRate >= 80) {
      return 'text-[#00635D]';
    } else if (this.weeklyReminderConfirmationRate >= 60) {
      return 'text-[#541A75]';
    }
    return 'text-[#CB1527]';
  }
}
