import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Alert } from '../../models/alert.model';

@Component({
  selector: 'app-clinical-notes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div class="rounded-2xl bg-white shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
    
    <!-- Header -->
    <div class="border-b border-[#C0E0DE]/30 bg-gradient-to-r from-[#541A75] to-[#00635D] px-6 py-4 text-white flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold">Clinical Notes</h2>
        <p class="text-xs opacity-90 mt-1">Alert #{{ alert?.id }} - {{ alert?.title }}</p>
      </div>
      <button (click)="onCancel()" class="text-2xl hover:opacity-75 transition">
        ✕
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      
      <!-- Alert Info Card -->
      <div class="rounded-xl border border-[#C0E0DE]/40 bg-[#f8fbfb] p-4">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-xs text-[#7E7F9A] font-semibold uppercase">Patient</p>
            <p class="font-semibold text-[#541A75]">{{ alert?.patientName }}</p>
          </div>
          <div>
            <p class="text-xs text-[#7E7F9A] font-semibold uppercase">Severity</p>
            <p class="font-semibold" [ngClass]="getSeverityClass()">
              {{ alert?.severity }}
            </p>
          </div>
          <div>
            <p class="text-xs text-[#7E7F9A] font-semibold uppercase">Status</p>
            <p class="font-semibold text-[#00635D]">{{ alert?.status }}</p>
          </div>
          <div>
            <p class="text-xs text-[#7E7F9A] font-semibold uppercase">Created</p>
            <p class="text-xs text-[#7E7F9A]">{{ formatDate(alert?.createdAt) }}</p>
          </div>
        </div>
      </div>

      <!-- Alert Description -->
      <div class="rounded-xl border border-[#C0E0DE]/40 bg-white p-4">
        <p class="text-xs text-[#7E7F9A] font-semibold uppercase mb-2">Alert Description</p>
        <p class="text-sm text-[#541A75] leading-relaxed">
          {{ alert?.description }}
        </p>
      </div>

      <!-- Clinical Notes Editor -->
      <div class="rounded-xl border border-[#541A75]/30 bg-[#f8f6fb] p-4">
        <label class="block text-xs text-[#541A75] font-semibold uppercase mb-3">
          Clinical Notes
        </label>
        <textarea
          [(ngModel)]="clinicalNotes"
          placeholder="Type your clinical observations, decisions, and recommendations here..."
          rows="8"
          class="w-full rounded-lg border border-[#C0E0DE] bg-white px-4 py-3 text-sm text-[#541A75] outline-none focus:border-[#541A75] focus:ring-2 focus:ring-[#541A75]/30 resize-none font-mono"
        ></textarea>
        <p class="text-xs text-[#7E7F9A] mt-2">
          {{ clinicalNotes.length }} characters
        </p>
      </div>

      <!-- Recommended Actions -->
      <div class="rounded-xl border border-[#00635D]/30 bg-[#f0f7f7] p-4">
        <p class="text-xs text-[#00635D] font-semibold uppercase mb-3">Quick Actions</p>
        <div class="space-y-2">
          <button 
            (click)="addTemplate('Monitored and stable. No immediate intervention required.')"
            type="button"
            class="w-full text-left rounded-lg border border-[#00635D]/40 bg-white px-3 py-2 text-xs hover:bg-[#00635D]/5 transition text-[#00635D]">
            ✓ Monitored and stable
          </button>
          <button 
            (click)="addTemplate('Intervention initiated. Follow-up required in 24h.')"
            type="button"
            class="w-full text-left rounded-lg border border-[#00635D]/40 bg-white px-3 py-2 text-xs hover:bg-[#00635D]/5 transition text-[#00635D]">
            🔧 Intervention initiated
          </button>
          <button 
            (click)="addTemplate('Alert resolved. Patient advised on preventive measures.')"
            type="button"
            class="w-full text-left rounded-lg border border-[#00635D]/40 bg-white px-3 py-2 text-xs hover:bg-[#00635D]/5 transition text-[#00635D]">
            ✅ Alert resolved
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t border-[#C0E0DE]/30 bg-[#f8fbfb] px-6 py-4 flex gap-3 justify-end">
      <button
        (click)="onCancel()"
        type="button"
        class="rounded-lg border border-[#C0E0DE] bg-white px-4 py-2 text-sm font-semibold text-[#541A75] hover:bg-[#f8fbfb] transition">
        Cancel
      </button>
      <button
        (click)="onSave()"
        type="button"
        [disabled]="!clinicalNotes.trim()"
        class="rounded-lg bg-gradient-to-r from-[#541A75] to-[#00635D] px-6 py-2 text-sm font-semibold text-white hover:shadow-lg disabled:opacity-50 transition">
        💾 Save Notes
      </button>
    </div>
  </div>
</div>
  `
})
export class ClinicalNotesPanelComponent implements OnInit {
  @Input() alert: Alert | null = null;
  @Output() save = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  clinicalNotes = '';

  ngOnInit(): void {
    // Charger les notes existantes si disponibles
    if (this.alert && (this.alert as any).clinicalNotes) {
      this.clinicalNotes = (this.alert as any).clinicalNotes;
    }
  }

  getSeverityClass(): string {
    switch (this.alert?.severity) {
      case 'CRITICAL':
        return 'text-[#CB1527]';
      case 'HIGH':
        return 'text-[#541A75]';
      case 'MEDIUM':
        return 'text-[#00635D]';
      default:
        return 'text-[#7E7F9A]';
    }
  }

  formatDate(date?: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  addTemplate(template: string): void {
    if (this.clinicalNotes) {
      this.clinicalNotes += '\n' + template;
    } else {
      this.clinicalNotes = template;
    }
  }

  onSave(): void {
    this.save.emit(this.clinicalNotes);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
