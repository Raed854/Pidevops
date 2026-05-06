import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Alert, AlertType, AlertStatus, AlertSeverity } from '../../models/alert.model';

@Component({
  selector: 'app-alert-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="rounded-lg border bg-white shadow-sm overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1"
      [ngClass]="borderClass">
      
      <!-- Accent strip top -->
      <div class="h-1 w-full bg-gradient-to-r" [ngClass]="accentClass"></div>

      <div class="p-4 space-y-3">
        <!-- Top Row: Icon + Title + Badge -->
        <div class="flex gap-3 items-start">
          <div class="text-3xl shrink-0">{{ getIcon(alert.type) }}</div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-sm text-[#541A75] truncate">{{ alert.title }}</h3>
            <p class="text-xs text-[#7E7F9A] mt-0.5">{{ formatType(alert.type) }}</p>
          </div>
          <div class="inline-flex shrink-0 items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
            [ngClass]="badgeClass">
            {{ getSeverityIcon() }}
            <span>{{ alert.severity }}</span>
          </div>
        </div>

        <!-- Description -->
        <p class="text-sm text-[#7E7F9A] leading-relaxed line-clamp-2">{{ alert.description }}</p>

        <!-- Meta Info -->
        <div class="flex items-center justify-between text-xs text-[#7E7F9A] py-2 border-t border-[#C0E0DE]/30 border-b">
          <span>{{ formatDate(alert.createdAt) }}</span>
          <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#f8fbfb]"
            [ngClass]="statusTagClass">
            {{ getStatusIcon() }} {{ formatStatus(alert.status) }}
          </div>
        </div>

        <!-- Risk Bar -->
        <div class="flex items-center gap-2">
          <div class="flex-1 h-1.5 bg-gradient-to-r from-[#C0E0DE]/40 to-transparent rounded-full overflow-hidden">
            <div class="h-full rounded-full"
              [style.width.%]="getSeverityScore(alert.severity)"
              [ngClass]="riskBarClass"></div>
          </div>
          <span class="text-xs font-semibold text-[#541A75]">{{ getSeverityScore(alert.severity) }}%</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-1.5 pt-2">
          <button
            (click)="toggleSpeech()"
            [disabled]="isSpeaking || isProcessing"
            type="button"
            class="px-2.5 py-1.5 rounded text-xs font-semibold transition-all duration-200
              {{ isSpeaking ? 'bg-[#00635D] text-white' : 'bg-[#C0E0DE]/20 text-[#00635D] hover:bg-[#C0E0DE]/40' }}
              {{ isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md' }}">
            {{ isSpeaking ? '⏸ Stop' : '🔊 Read' }}
          </button>

          <button
            *ngIf="alert.status === 'UNREAD' || alert.status === 'IN_PROGRESS'"
            (click)="onTakeCharge()"
            [disabled]="isProcessing"
            type="button"
            class="px-2.5 py-1.5 rounded text-xs font-semibold transition-all duration-200 transform
              {{ processingAction === 'charge' ? 'bg-[#541A75] text-white shadow-lg scale-105' : 'bg-[#541A75]/20 text-[#541A75] hover:bg-[#541A75]/35 hover:shadow-md' }}
              {{ isProcessing ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105' }}">
            {{ processingAction === 'charge' ? '⟳ ...' : '✋ Charge' }}
          </button>

          <button
            *ngIf="alert.status !== 'RESOLVED'"
            (click)="onResolve()"
            [disabled]="isProcessing"
            type="button"
            class="px-2.5 py-1.5 rounded text-xs font-semibold transition-all duration-200 transform
              {{ processingAction === 'resolve' ? 'bg-[#00635D] text-white shadow-lg scale-105' : 'bg-[#00635D]/20 text-[#00635D] hover:bg-[#00635D]/35 hover:shadow-md' }}
              {{ isProcessing ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105' }}">
            {{ processingAction === 'resolve' ? '⟳ ...' : '✓ Resolve' }}
          </button>

          <button
            (click)="onAddNote()"
            [disabled]="isProcessing"
            type="button"
            class="px-2.5 py-1.5 rounded text-xs font-semibold transition-all duration-200 transform
              {{ processingAction === 'note' ? 'bg-[#7E7F9A] text-white shadow-lg scale-105' : 'bg-[#7E7F9A]/20 text-[#7E7F9A] hover:bg-[#7E7F9A]/35 hover:shadow-md' }}
              {{ isProcessing ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105' }}">
            {{ processingAction === 'note' ? '⟳ ...' : '📝 Note' }}
          </button>
        </div>
      </div>
    </article>
  `,
  styles: []
})
export class AlertCardComponent implements OnDestroy {
  @Input() alert!: Alert;
  @Output() takeInCharge = new EventEmitter<number>();
  @Output() resolve = new EventEmitter<number>();  
  @Output() addNote = new EventEmitter<number>();

  isSpeaking = false;
  isProcessing = false;
  processingAction: string | null = null;

  get borderClass(): string {
    const sev = (this.alert.severity || 'MEDIUM').toUpperCase();
    if (sev === 'CRITICAL') return 'border border-[#CB1527]/40 bg-gradient-to-br from-white to-[#fff5f7]';
    if (sev === 'HIGH') return 'border border-[#541A75]/30 bg-white';
    if (sev === 'MEDIUM') return 'border border-[#7E7F9A]/25 bg-white';
    return 'border border-[#C0E0DE]/40 bg-white';
  }

  get accentClass(): string {
    const sev = (this.alert.severity || 'MEDIUM').toUpperCase();
    if (sev === 'CRITICAL') return 'from-[#CB1527] to-[#ff6b7a]';
    if (sev === 'HIGH') return 'from-[#541A75] to-[#7E7F9A]';
    if (sev === 'MEDIUM') return 'from-[#7E7F9A] to-[#541A75]';
    return 'from-[#00635D] to-[#C0E0DE]';
  }

  get badgeClass(): string {
    const sev = (this.alert.severity || 'MEDIUM').toUpperCase();
    if (sev === 'CRITICAL') return 'bg-[#CB1527]/15 text-[#CB1527]';
    if (sev === 'HIGH') return 'bg-[#541A75]/15 text-[#541A75]';
    if (sev === 'MEDIUM') return 'bg-[#7E7F9A]/15 text-[#7E7F9A]';
    return 'bg-[#00635D]/15 text-[#00635D]';
  }

  get statusTagClass(): string {
    const status = (this.alert.status || 'UNREAD').toUpperCase();
    if (status === ' RESOLVED') return 'text-[#00635D]';
    if (status === 'IN_PROGRESS') return 'text-[#541A75]';
    return 'text-[#CB1527]';
  }

  get riskBarClass(): string {
    const sev = (this.alert.severity || 'MEDIUM').toUpperCase();
    if (sev === 'CRITICAL') return 'bg-[#CB1527]';
    if (sev === 'HIGH') return 'bg-[#541A75]';
    if (sev === 'MEDIUM') return 'bg-[#7E7F9A]';
    return 'bg-[#00635D]';
  }

  getIcon(type: AlertType): string {
    const icons: Record<AlertType, string> = {
      'MEDICATION_MISSED': '💊',
      'COGNITIVE_DECLINE': '🧠',
      'CAREGIVER_BURNOUT': '🤝',
      'SAFETY': '🛡️',
      'REMINDER_DELAY': '⏰',
      'REMINDER_MISSED': '🚨',
      'WELLBEING': '💚',
      'WEATHER': '☂️',
      'MANUAL': '🔔'
    };
    return icons[type] || '🔔';
  }

  getSeverityIcon(): string {
    const sev = (this.alert.severity || 'MEDIUM').toUpperCase();
    if (sev === 'CRITICAL') return '🔴';
    if (sev === 'HIGH') return '🟠';
    if (sev === 'MEDIUM') return '🟡';
    return '🟢';
  }

  getStatusIcon(): string {
    const status = (this.alert.status || 'UNREAD').toUpperCase();
    if (status === 'RESOLVED') return '✓';
    if (status === 'IN_PROGRESS') return '⟳';
    return '🔴';
  }

  formatType(type: AlertType): string {
    return type.replace(/_/g, ' ');
  }

  formatStatus(status: AlertStatus): string {
    if (status === 'UNREAD') return 'New';
    if (status === 'IN_PROGRESS') return 'In Progress';
    if (status === 'RESOLVED') return 'Resolved';
    return status;
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  getSeverityScore(severity: AlertSeverity | string): number {
    const sev = (severity || 'MEDIUM').toUpperCase();
    if (sev === 'CRITICAL') return 95;
    if (sev === 'HIGH') return 70;
    if (sev === 'MEDIUM') return 45;
    return 20;
  }

  toggleSpeech(): void {
    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    } else {
      const text = `${this.alert.title}. ${this.alert.description}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => (this.isSpeaking = false);
      this.isSpeaking = true;
      window.speechSynthesis.speak(utterance);
    }
  }

  onTakeCharge(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.processingAction = 'charge';
    this.takeInCharge.emit(this.alert.id);
    setTimeout(() => {
      this.isProcessing = false;
      this.processingAction = null;
    }, 1000);
  }

  onResolve(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.processingAction = 'resolve';
    this.resolve.emit(this.alert.id);
    setTimeout(() => {
      this.isProcessing = false;
      this.processingAction = null;
    }, 1000);
  }

  onAddNote(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.processingAction = 'note';
    this.addNote.emit(this.alert.id);
    setTimeout(() => {
      this.isProcessing = false;
      this.processingAction = null;
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
    }
  }
}
