import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Alert, AlertType } from '../../models/alert.model';

@Component({
  selector: 'app-critical-alert-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border-2 border-[#CB1527] bg-gradient-to-br from-[#FEF2F2] to-white p-4 shadow-md ring-2 ring-[#CB1527]/20 relative overflow-hidden">
      <!-- Background accent -->
      <div class="absolute top-0 right-0 w-24 h-24 bg-[#CB1527]/5 rounded-full -mr-12 -mt-12"></div>

      <!-- Badge critique -->
      <div class="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-[#CB1527] px-3 py-1 text-white">
        <span class="text-sm font-bold">🔴 CRITIQUE</span>
      </div>

      <!-- Header -->
      <div class="relative z-10 mb-3 pr-24">
        <h3 class="text-base font-bold text-[#CB1527]">{{ alert.title }}</h3>
        <p class="text-xs text-[#7E7F9A] mt-1">{{ alert.patientName }} • {{ formatDate(alert.createdAt) }}</p>
      </div>

      <!-- Severity Score (always max for critical) -->
      <div class="relative z-10 mb-4 p-3 rounded-lg bg-white border-2 border-[#CB1527]/30">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-[#CB1527]">Score de Gravité</span>
          <span class="text-lg font-bold text-[#CB1527]">{{ severityScore }}/100</span>
        </div>
        <div class="h-3 w-full rounded-full bg-[#CB1527]/20 overflow-hidden">
          <div class="h-full w-full bg-[#CB1527] rounded-full">
        </div>
      </div>

      <!-- Description -->
      <p class="relative z-10 text-sm font-semibold text-[#541A75] mb-3">{{ alert.description }}</p>

      <!-- Metadata -->
      <div class="relative z-10 flex flex-wrap gap-2 mb-4">
        <span class="inline-block rounded-full bg-[#CB1527]/20 px-2.5 py-1 text-xs font-bold text-[#CB1527]">
          {{ formatAlertType(alert.type) }}
        </span>
        <span *ngIf="alert.reminderId" class="inline-block rounded-full bg-[#541A75]/20 px-2.5 py-1 text-xs font-bold text-[#541A75]">
          🔗 REMINDER_MISSED
        </span>
        <span *ngIf="!alert.read" class="inline-block rounded-full bg-[#FDB92E]/30 px-2.5 py-1 text-xs font-bold text-[#541A75]">
          👁️ NON LU
        </span>
      </div>

      <!-- Urgent Actions -->
      <div class="relative z-10 flex gap-2">
        <button
          (click)="onAction('take-charge')"
          class="flex-1 rounded-lg bg-[#CB1527] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#B30D1F] active:scale-95 shadow-md">
          🚨 PRENDRE EN CHARGE IMMÉDIATEMENT
        </button>
        <button
          (click)="onAction('resolve')"
          class="flex-1 rounded-lg bg-[#00635D] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#004545] active:scale-95 shadow-md">
          ✓ Résolu
        </button>
      </div>

      <!-- Escalation info -->
      <div class="relative z-10 mt-3 rounded-lg bg-[#CB1527]/10 border border-[#CB1527]/30 p-2 border-l-4 border-l-[#CB1527]">
        <p class="text-xs text-[#CB1527] font-semibold">⚠️ Cette alerte nécessite une action immédiate du médecin.</p>
      </div>
    </div>
  `,
  styles: []
})
export class CriticalAlertCardComponent implements OnInit {
  @Input() alert!: Alert;
  @Output() actionTriggered = new EventEmitter<{ action: string; alertId: number }>();

  severityScore = 92;

  ngOnInit(): void {
    // Critical alerts always high score
    this.severityScore = 85 + Math.random() * 15;
    this.severityScore = Math.round(this.severityScore);
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatAlertType(type: AlertType): string {
    const typeMap: Record<AlertType, string> = {
      'MEDICATION_MISSED': '💊 Médicament oublié',
      'COGNITIVE_DECLINE': '🧠 Déclin cognitif',
      'CAREGIVER_BURNOUT': '😔 Épuisement soignant',
      'SAFETY': '🛡️ Sécurité',
      'REMINDER_DELAY': '⏱️ Retard rappel',
      'REMINDER_MISSED': '❌ Rappel manqué',
      'WELLBEING': '💚 Bien-être',
      'WEATHER': '☂️ Alerte météo',
      'MANUAL': '👤 Manuel'
    };
    return typeMap[type] || type;
  }

  onAction(action: string): void {
    this.actionTriggered.emit({ action, alertId: this.alert.id });
  }
}
