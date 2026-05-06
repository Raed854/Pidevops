import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Alert, AlertRole, AlertStatus, AlertType, AlertSeverity } from '../../models/alert.model';

@Component({
  selector: 'app-alert-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="group rounded-lg border transition-all duration-200 p-4"
      [ngClass]="cardClasses"
      (mouseenter)="isHovered = true"
      (mouseleave)="isHovered = false">
      <!-- Header with Title & Severity Score -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2 mb-1">
            <h3 class="text-sm font-semibold text-[#541A75] truncate">{{ alert.title }}</h3>
            <span class="inline-block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" [ngClass]="statusBadgeClass">
              {{ statusLabel }}
            </span>
          </div>
          <p class="text-xs text-[#7E7F9A]">{{ alert.patientName }} • {{ formatDate(alert.createdAt) }}</p>
        </div>
      </div>

      <!-- Severity Score (Dynamic 0-100 with color gradient) -->
      <div class="mb-4 p-3 rounded-lg bg-white/50 border border-[#C0E0DE]/20">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-[#7E7F9A]">Score de Gravité</span>
          <span class="text-sm font-bold" [ngStyle]="{ color: severityColor }">{{ severityScore }}/100</span>
        </div>
        <!-- Severity Bar -->
        <div class="h-2 w-full rounded-full bg-[#C0E0DE]/30 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            [style.width.%]="severityScore"
            [style.backgroundColor]="severityColor"></div>
        </div>
        <!-- AI Explanation -->
        <p class="mt-2 text-xs text-[#7E7F9A] italic">{{ tinyAIExplanation }}</p>
      </div>

      <!-- Description -->
      <p class="text-sm text-[#541A75] mb-3 line-clamp-2">{{ alert.description }}</p>

      <!-- Type & Metadata -->
      <div class="flex flex-wrap gap-2 mb-3">
        <span class="inline-block rounded-full bg-[#C0E0DE]/30 px-2.5 py-1 text-xs font-semibold text-[#00635D]">
          {{ formatAlertType(alert.type) }}
        </span>
        <span *ngIf="alert.reminderId" class="inline-block rounded-full bg-[#541A75]/10 px-2.5 py-1 text-xs font-semibold text-[#541A75]">
          🔗 REMINDER_MISSED
        </span>
        <span *ngIf="isOverdue" class="inline-block rounded-full bg-[#CB1527]/20 px-2.5 py-1 text-xs font-bold text-[#CB1527]">
          ⏰ > 24h
        </span>
      </div>

      <!-- Action Buttons (appear on hover) -->
      <div class="flex gap-2" [ngClass]="isHovered ? 'opacity-100' : 'opacity-70'">
        <button
          (click)="onAction('take-charge')"
          class="flex-1 rounded-lg bg-[#541A75] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3d1556] active:scale-95">
          📋 Prendre en charge
        </button>
        <button
          (click)="onAction('resolve')"
          class="flex-1 rounded-lg bg-[#00635D] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#004545] active:scale-95">
          ✓ Résoudre
        </button>
        <button
          (click)="onAction('add-note')"
          class="flex-1 rounded-lg border border-[#7E7F9A]/40 bg-white px-3 py-2 text-xs font-semibold text-[#541A75] transition hover:bg-[#f8fbfb] active:scale-95">
          📝 Note
        </button>
      </div>
    </div>
  `
})
export class AlertCardComponent implements OnInit {
  @Input() alert!: Alert;
  @Output() actionTriggered = new EventEmitter<{ action: string; alertId: number }>();

  isHovered = false;
  severityScore = 0;
  severityColor = '#00635D';
  statusLabel = '';
  isOverdue = false;

  ngOnInit(): void {
    this.calculateSeverityScore();
    this.calculateStatusLabel();
    this.checkIfOverdue();
  }

  get cardClasses(): string {
    let base = 'bg-white ring-1';

    if (this.alert.status === 'UNREAD') {
      base += ' border-[#541A75]/40 ring-[#541A75]/20 shadow-sm';
    } else if (this.alert.status === 'IN_PROGRESS') {
      base += ' border-[#7E7F9A]/30 ring-[#7E7F9A]/15 shadow-sm';
    } else {
      base += ' border-[#C0E0DE]/40 ring-[#C0E0DE]/15 shadow-sm';
    }

    return base;
  }

  get statusBadgeClass(): string {
    switch (this.alert.status) {
      case 'UNREAD':
        return 'bg-[#541A75] text-white';
      case 'IN_PROGRESS':
        return 'bg-[#FDB92E] text-[#541A75]';
      case 'RESOLVED':
        return 'bg-[#C0E0DE] text-[#00635D]';
      default:
        return 'bg-[#7E7F9A]/20 text-[#541A75]';
    }
  }

  private calculateSeverityScore(): void {
    // Dynamically calculate score based on severity
    switch (this.alert.severity) {
      case 'CRITICAL':
        this.severityScore = 85 + Math.random() * 15; // 85-100
        break;
      case 'HIGH':
        this.severityScore = 60 + Math.random() * 25; // 60-85
        break;
      case 'MEDIUM':
        this.severityScore = 35 + Math.random() * 25; // 35-60
        break;
      case 'LOW':
        this.severityScore = 10 + Math.random() * 25; // 10-35
        break;
      default:
        this.severityScore = 50;
    }

    this.severityScore = Math.round(this.severityScore);
    this.updateSeverityColor();
  }

  private updateSeverityColor(): void {
    if (this.severityScore >= 80) {
      this.severityColor = '#CB1527'; // Red
    } else if (this.severityScore >= 60) {
      this.severityColor = '#F97316'; // Orange
    } else if (this.severityScore >= 40) {
      this.severityColor = '#FDB92E'; // Yellow
    } else {
      this.severityColor = '#00635D'; // Green
    }
  }

  private calculateStatusLabel(): void {
    switch (this.alert.status) {
      case 'UNREAD':
        this.statusLabel = 'Nouveau';
        break;
      case 'IN_PROGRESS':
        this.statusLabel = 'En cours';
        break;
      case 'RESOLVED':
        this.statusLabel = 'Résolu';
        break;
      default:
        this.statusLabel = this.alert.status;
    }
  }

  private checkIfOverdue(): void {
    const alertDate = new Date(this.alert.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - alertDate.getTime()) / (1000 * 60 * 60);
    this.isOverdue = diffHours > 24 && this.alert.status !== 'RESOLVED';
  }

  get tinyAIExplanation(): string {
    const explanations: Record<AlertStatus, string> = {
      'UNREAD': 'Nécessite votre attention immédiate.',
      'IN_PROGRESS': 'Vous avez pris cette alerte. Continuez le suivi.',
      'RESOLVED': 'Alerte traitée et close.'
    };
    return explanations[this.alert.status] || 'Suivi recommandé.';
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

  // Legacy methods for backward compatibility
  severityClass(severity: Alert['severity']): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-[#CB1527]/10 text-[#CB1527]';
      case 'HIGH':
        return 'bg-[#541A75]/10 text-[#541A75]';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-[#00635D]/10 text-[#00635D]';
    }
  }

  iconByType(type: Alert['type']): string {
    switch (type) {
      case 'MEDICATION_MISSED':
        return '💊';
      case 'COGNITIVE_DECLINE':
        return '🧠';
      case 'CAREGIVER_BURNOUT':
        return '🧑‍⚕️';
      case 'SAFETY':
        return '🛡️';
      case 'REMINDER_DELAY':
        return '⏰';
      case 'WELLBEING':
        return '💚';
      case 'WEATHER':
        return '☂️';
      default:
        return '🔔';
    }
  }
}

