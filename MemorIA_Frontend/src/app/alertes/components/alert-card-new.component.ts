import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Alert } from '../../models/alert.model';

@Component({
  selector: 'app-alert-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article 
      class="rounded-2xl border-l-4 bg-white p-5 shadow-sm ring-1 ring-[#C0E0DE]/40 transition-all duration-200 hover:shadow-md"
      [ngClass]="getBorderClass()">

      <div class="flex items-start gap-4">
        <!-- ICON + SEVERITY BADGE -->
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl" 
          [ngClass]="getSeverityBgClass()">
          {{ getTypeIcon() }}
        </div>

        <!-- CONTENU PRINCIPAL -->
        <div class="min-w-0 flex-1">
          <!-- En-tête: titre + badges -->
          <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div class="min-w-0">
              <h3 class="font-semibold text-[#541A75] truncate">{{ alert.title }}</h3>
              <p class="text-xs text-[#7E7F9A]">
                {{ getTypeLabel() }} • {{ alert.createdAt | date: 'short' }}
              </p>
            </div>

            <!-- Badges status -->
            <div class="flex items-center gap-2 shrink-0">
              <span class="rounded-full px-3 py-1 text-xs font-semibold"
                [ngClass]="getSeverityBadgeClass()">
                {{ alert.severity }}
              </span>
              <span class="rounded-full px-3 py-1 text-xs font-semibold"
                [ngClass]="getStatusBadgeClass()">
                {{ getStatusLabel() }}
              </span>
            </div>
          </div>

          <!-- Description -->
          <p class="text-sm text-slate-700 mb-3 line-clamp-2">{{ alert.description }}</p>

          <!-- SCORE SEVERITÉ (0-100) -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-[#7E7F9A]">Indice de gravité</span>
              <span class="text-sm font-bold" [ngClass]="getSeverityScoreColor()">
                {{ getSeverityScore() }}%
              </span>
            </div>
            <div class="h-2 rounded-full bg-[#C0E0DE]/30">
              <div 
                class="h-full rounded-full transition-all duration-300"
                [ngClass]="getSeverityBarColor()"
                [style.width.%]="getSeverityScore()">
              </div>
            </div>
          </div>

          <!-- BOUTONS D'ACTION -->
          <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-[#C0E0DE]/20">
            <!-- Prendre en charge -->
            <button 
              *ngIf="alert.status === 'UNREAD'"
              type="button"
              (click)="emitAction('take-charge')"
              class="rounded-lg bg-[#541A75] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#6a2a8f] active:scale-95">
              👋 Prendre en charge
            </button>

            <!-- Marquer résolu -->
            <button 
              *ngIf="alert.status !== 'RESOLVED'"
              type="button"
              (click)="emitAction('resolve')"
              class="rounded-lg border border-[#00635D] px-4 py-2 text-xs font-semibold text-[#00635D] transition hover:bg-[#00635D]/5 active:scale-95">
              ✓ Marquer résolu
            </button>

            <!-- Ajouter note -->
            <button 
              type="button"
              (click)="emitAction('add-note')"
              class="rounded-lg border border-[#7E7F9A] px-4 py-2 text-xs font-semibold text-[#7E7F9A] transition hover:bg-[#7E7F9A]/5 active:scale-95">
              📝 Ajouter note
            </button>

            <!-- Indicateur "créée manuellement" -->
            <span *ngIf="alert.isManual" class="ml-auto text-xs text-[#7E7F9A]">
              ✏️ Créée manuellement
            </span>
          </div>
        </div>
      </div>
    </article>
  `
})
export class AlertCardComponent {
  @Input() alert!: Alert;
  @Output() actionTriggered = new EventEmitter<{ action: 'take-charge' | 'resolve' | 'add-note'; alertId: number }>();

  getTypeIcon(): string {
    switch (this.alert.type) {
      case 'MEDICATION_MISSED': return '💊';
      case 'SAFETY': return '🛡️';
      case 'COGNITIVE_DECLINE': return '🧠';
      case 'CAREGIVER_BURNOUT': return '😓';
      case 'REMINDER_DELAY': return '🔔';
      case 'REMINDER_MISSED': return '🔔';
      case 'WELLBEING': return '❤️';
      case 'WEATHER': return '☂️';
      case 'MANUAL': return '📝';
      default: return '📋';
    }
  }

  getTypeLabel(): string {
    switch (this.alert.type) {
      case 'MEDICATION_MISSED': return 'Médicament manqué';
      case 'SAFETY': return 'Sécurité';
      case 'COGNITIVE_DECLINE': return 'Déclin cognitif';
      case 'CAREGIVER_BURNOUT': return 'Épuisement soignant';
      case 'REMINDER_DELAY': return 'Retard rappel';
      case 'REMINDER_MISSED': return 'Rappel manqué';
      case 'WELLBEING': return 'Bien-être';
      case 'WEATHER': return 'Météo';
      case 'MANUAL': return 'Manuelle';
      default: return 'Alerte';
    }
  }

  getStatusLabel(): string {
    switch (this.alert.status) {
      case 'UNREAD': return 'Non lue';
      case 'IN_PROGRESS': return 'En cours';
      case 'RESOLVED': return 'Résolue';
      default: return this.alert.status;
    }
  }

  /**
   * Compute severity score (0-100) based on alert severity
   */
  getSeverityScore(): number {
    switch (this.alert.severity) {
      case 'CRITICAL': return 100;
      case 'HIGH': return 75;
      case 'MEDIUM': return 50;
      case 'LOW': return 25;
      default: return 50;
    }
  }

  getBorderClass(): string {
    switch (this.alert.severity) {
      case 'CRITICAL': return 'border-[#CB1527] bg-[#CB1527]/2';
      case 'HIGH': return 'border-[#541A75] bg-white';
      case 'MEDIUM': return 'border-[#7E7F9A] bg-white';
      default: return 'border-[#C0E0DE] bg-white';
    }
  }

  getSeverityBgClass(): string {
    switch (this.alert.severity) {
      case 'CRITICAL': return 'bg-[#CB1527]/20 text-[#CB1527]';
      case 'HIGH': return 'bg-[#541A75]/20 text-[#541A75]';
      case 'MEDIUM': return 'bg-[#7E7F9A]/20 text-[#7E7F9A]';
      case 'LOW': return 'bg-[#C0E0DE] text-[#00635D]';
      default: return 'bg-[#541A75]/20 text-[#541A75]';
    }
  }

  getSeverityBadgeClass(): string {
    switch (this.alert.severity) {
      case 'CRITICAL': return 'border border-[#CB1527] bg-[#CB1527]/10 text-[#CB1527]';
      case 'HIGH': return 'border border-[#541A75] bg-[#541A75]/10 text-[#541A75]';
      case 'MEDIUM': return 'border border-[#7E7F9A] bg-[#7E7F9A]/10 text-[#7E7F9A]';
      default: return 'border border-[#C0E0DE] bg-[#C0E0DE]/10 text-[#00635D]';
    }
  }

  getStatusBadgeClass(): string {
    switch (this.alert.status) {
      case 'UNREAD': return 'border border-[#CB1527] bg-[#CB1527]/10 text-[#CB1527]';
      case 'IN_PROGRESS': return 'border border-[#541A75] bg-[#541A75]/10 text-[#541A75]';
      case 'RESOLVED': return 'border border-[#00635D] bg-[#00635D]/10 text-[#00635D]';
      default: return 'border border-[#7E7F9A] bg-[#7E7F9A]/10 text-[#7E7F9A]';
    }
  }

  getSeverityScoreColor(): string {
    switch (this.alert.severity) {
      case 'CRITICAL': return 'text-[#CB1527]';
      case 'HIGH': return 'text-[#541A75]';
      case 'MEDIUM': return 'text-[#7E7F9A]';
      default: return 'text-[#00635D]';
    }
  }

  getSeverityBarColor(): string {
    switch (this.alert.severity) {
      case 'CRITICAL': return 'bg-[#CB1527]';
      case 'HIGH': return 'bg-[#541A75]';
      case 'MEDIUM': return 'bg-[#7E7F9A]';
      default: return 'bg-[#00635D]';
    }
  }

  emitAction(action: 'take-charge' | 'resolve' | 'add-note'): void {
    this.actionTriggered.emit({ action, alertId: this.alert.id });
  }
}
