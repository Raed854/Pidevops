import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Alert, AlertType, AlertStatus, AlertSeverity } from '../../models/alert.model';

@Component({
  selector: 'app-alert-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="rounded-2xl border bg-white shadow-sm overflow-hidden transition-all hover:shadow-md"
      [ngClass]="borderClass">
      <div class="p-5">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex gap-3 items-start flex-1">
            <span class="text-2xl">{{ getIcon(alert.type) }}</span>
            <div class="flex-1">
              <h3 class="font-semibold text-[#541A75]">{{ alert.title }}</h3>
              <p class="text-xs text-[#7E7F9A] mt-0.5">{{ formatType(alert.type) }}</p>
            </div>
          </div>
          <span class="text-xs font-semibold px-3 py-1 rounded-full shrink-0"
            [ngClass]="severityClass">
            {{ alert.severity }}
          </span>
        </div>

        <!-- Description -->
        <p class="text-sm text-[#7E7F9A] mb-4 leading-relaxed">{{ alert.description }}</p>

        <!-- Time and Status -->
        <div class="flex justify-between items-center text-xs mb-4">
          <span class="text-[#7E7F9A]">{{ formatDate(alert.createdAt) }}</span>
          <span class="font-semibold px-2 py-1 rounded-full"
            [ngClass]="statusClass">
            {{ formatStatus(alert.status) }}
          </span>
        </div>

        <!-- Score bar -->
        <div class="flex items-center gap-3 mb-5">
          <div class="flex-1 h-2 bg-[#C0E0DE]/30 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" 
              [style.width.%]="getSeverityScore(alert.severity)"
              [ngClass]="scoreBarClass"></div>
          </div>
          <span class="text-xs text-[#7E7F9A] w-8">{{ getSeverityScore(alert.severity) }}%</span>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2">
          <button
            (click)="toggleSpeech()"
            [disabled]="isSpeaking"
            type="button"
            class="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[#C0E0DE]/40 text-[#00635D] hover:bg-[#C0E0DE]/60 disabled:opacity-50 transition">
            <span>{{ isSpeaking ? '⏸' : '🔊' }}</span>
            {{ isSpeaking ? 'Stop' : 'Read' }}
          </button>
          <button
            *ngIf="alert.status === 'UNREAD' || alert.status === 'IN_PROGRESS'"
            (click)="onTakeCharge()"
            type="button"
            class="px-3 py-2 rounded-lg text-xs font-semibold bg-[#541A75]/10 text-[#541A75] hover:bg-[#541A75]/20 transition">
            Take Charge
          </button>
          <button
            *ngIf="alert.status !== 'RESOLVED'"
            (click)="onResolve()"
            type="button"
            class="px-3 py-2 rounded-lg text-xs font-semibold bg-[#00635D]/10 text-[#00635D] hover:bg-[#00635D]/20 transition">
            Resolve
          </button>
          <button
            (click)="onAddNote()"
            type="button"
            class="px-3 py-2 rounded-lg text-xs font-semibold bg-[#7E7F9A]/10 text-[#7E7F9A] hover:bg-[#7E7F9A]/20 transition">
            💬 Note
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

  get borderClass(): string {
    const sev = (this.alert.severity || 'MEDIUM').toUpperCase();
    if (sev === 'CRITICAL') return 'border-l-4 border-l-[#CB1527] border-[#CB1527]/30 bg-[#fff6f8]';
    if (sev === 'HIGH') return 'border-l-4 border-l-[#541A75] border-[#541A75]/20';
    if (sev === 'MEDIUM') return 'border-l-4 border-l-[#7E7F9A] border-[#7E7F9A]/20';
    return 'border-l-4 border-l-[#C0E0DE] border-[#C0E0DE]/40';
  }

  get severityClass(): string {
    const sev = (this.alert.severity || 'MEDIUM').toUpperCase();
    if (sev === 'CRITICAL') return 'bg-[#CB1527]/10 text-[#CB1527] border border-[#CB1527]/30';
    if (sev === 'HIGH') return 'bg-[#541A75]/10 text-[#541A75] border border-[#541A75]/30';
    if (sev === 'MEDIUM') return 'bg-[#7E7F9A]/10 text-[#7E7F9A] border border-[#7E7F9A]/30';
    return 'bg-[#C0E0DE]/10 text-[#00635D] border border-[#C0E0DE]/30';
  }

  get statusClass(): string {
    const status = (this.alert.status || 'UNREAD').toUpperCase();
    if (status === 'RESOLVED') return 'bg-[#00635D]/10 text-[#00635D]';
    if (status === 'IN_PROGRESS') return 'bg-[#541A75]/10 text-[#541A75]';
    return 'bg-[#CB1527]/10 text-[#CB1527]';
  }

  get scoreBarClass(): string {
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

  formatType(type: AlertType): string {
    return type.replace(/_/g, ' ');
  }

  formatStatus(status: AlertStatus): string {
    if (status === 'UNREAD') return '🔴 New';
    if (status === 'IN_PROGRESS') return '⟳ In Progress';
    if (status === 'RESOLVED') return '✓ Resolved';
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
    this.takeInCharge.emit(this.alert.id);
  }

  onResolve(): void {
    this.resolve.emit(this.alert.id);
  }

  onAddNote(): void {
    this.addNote.emit(this.alert.id);
  }

  ngOnDestroy(): void {
    window.speechSynthesis.cancel();
  }
}
