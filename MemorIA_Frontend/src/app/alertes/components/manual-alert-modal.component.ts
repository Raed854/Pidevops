import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Alert } from '../../models/alert.model';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-manual-alert-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div *ngIf="isOpen">
      <!-- OVERLAY -->
      <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" (click)="onBackdropClick()"></div>

    <!-- MODAL -->
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <!-- HEADER -->
        <div class="border-b border-[#C0E0DE]/40 px-6 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-[#541A75]">Créer une alerte manuelle</h2>
              <p class="mt-1 text-sm text-[#7E7F9A]">Pour le patient sélectionné</p>
            </div>
            <button 
              type="button" 
              (click)="onClose()"
              class="rounded-lg p-2 text-[#7E7F9A] hover:bg-[#f1f2f8] hover:text-[#541A75]">
              ✕
            </button>
          </div>
        </div>

        <!-- FORMULAIRE -->
        <form [formGroup]="alertForm" (ngSubmit)="onSubmit()" class="space-y-6 p-6">
          <!-- Type d'alerte -->
          <div>
            <label class="block text-sm font-semibold text-[#541A75] mb-2">Type d'alerte *</label>
            <select 
              formControlName="type"
              class="w-full rounded-xl border border-[#C0E0DE] bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#541A75] focus:ring-2 focus:ring-[#541A75]/20">
              <option value="">Sélectionner un type...</option>
              <option value="MEDICATION_MISSED">💊 Médicament manqué</option>
              <option value="SAFETY">🛡️ Sécurité</option>
              <option value="COGNITIVE_DECLINE">🧠 Déclin cognitif</option>
              <option value="CAREGIVER_BURNOUT">😓 Épuisement soignant</option>
              <option value="REMINDER_MISSED">🔔 Rappel manqué</option>
              <option value="WELLBEING">❤️ Bien-être</option>
              <option value="MANUAL">📝 Autre alerte</option>
            </select>
            <p *ngIf="alertForm.get('type')?.hasError('required') && alertForm.get('type')?.touched" 
              class="mt-1 text-xs text-[#CB1527]">Type requis</p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-semibold text-[#541A75] mb-2">Description *</label>
            <textarea 
              formControlName="description"
              placeholder="Décrivez l'alerte en détail..."
              rows="3"
              class="w-full rounded-xl border border-[#C0E0DE] bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition placeholder-[#C0E0DE] focus:border-[#541A75] focus:ring-2 focus:ring-[#541A75]/20"></textarea>
            <p *ngIf="alertForm.get('description')?.hasError('required') && alertForm.get('description')?.touched" 
              class="mt-1 text-xs text-[#CB1527]">Description requise</p>
          </div>

          <!-- Sévérité -->
          <div>
            <label class="block text-sm font-semibold text-[#541A75] mb-2">Niveau de criticité *</label>
            <div class="grid grid-cols-3 gap-3">
              <button
                type="button"
                (click)="selectSeverity('MEDIUM')"
                class="rounded-xl border-2 px-4 py-3 text-sm font-medium transition"
                [ngClass]="alertForm.value.severity === 'MEDIUM'
                  ? 'border-[#7E7F9A] bg-[#7E7F9A]/10 text-[#7E7F9A]'
                  : 'border-[#C0E0DE] bg-white text-slate-700 hover:border-[#7E7F9A]'">
                🟡 Modérée
              </button>
              <button
                type="button"
                (click)="selectSeverity('HIGH')"
                class="rounded-xl border-2 px-4 py-3 text-sm font-medium transition"
                [ngClass]="alertForm.value.severity === 'HIGH'
                  ? 'border-[#541A75] bg-[#541A75]/10 text-[#541A75]'
                  : 'border-[#C0E0DE] bg-white text-slate-700 hover:border-[#541A75]'">
                🟠 Haute
              </button>
              <button
                type="button"
                (click)="selectSeverity('CRITICAL')"
                class="rounded-xl border-2 px-4 py-3 text-sm font-medium transition"
                [ngClass]="alertForm.value.severity === 'CRITICAL'
                  ? 'border-[#CB1527] bg-[#CB1527]/10 text-[#CB1527]'
                  : 'border-[#C0E0DE] bg-white text-slate-700 hover:border-[#CB1527]'">
                🔴 Critique
              </button>
            </div>
          </div>

          <!-- Date/Heure -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-[#541A75] mb-2">Date *</label>
              <input 
                type="date"
                formControlName="date"
                class="w-full rounded-xl border border-[#C0E0DE] bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#541A75] focus:ring-2 focus:ring-[#541A75]/20" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-[#541A75] mb-2">Heure *</label>
              <input 
                type="time"
                formControlName="time"
                class="w-full rounded-xl border border-[#C0E0DE] bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#541A75] focus:ring-2 focus:ring-[#541A75]/20" />
            </div>
          </div>

          <!-- Notifications -->
          <div class="flex items-center gap-3 rounded-xl bg-[#f8fbfb] p-4">
            <input 
              type="checkbox"
              formControlName="notifyDoctor"
              id="notifyDoctor"
              class="h-5 w-5 rounded border-[#C0E0DE] accent-[#541A75]" />
            <label for="notifyDoctor" class="text-sm text-slate-700 cursor-pointer">
              <strong>Notifier le médecin immédiatement</strong>
              <p class="text-xs text-[#7E7F9A]">Le médecin recevra une notification en temps réel</p>
            </label>
          </div>

          <!-- BOUTONS D'ACTION -->
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              (click)="onClose()"
              class="flex-1 rounded-xl border border-[#C0E0DE] bg-white px-4 py-2.5 font-medium text-[#7E7F9A] transition hover:bg-[#f8fbfb]">
              Annuler
            </button>
            <button
              type="submit"
              [disabled]="!alertForm.valid || isSubmitting"
              class="flex-1 rounded-xl bg-[#541A75] px-4 py-2.5 font-medium text-white transition disabled:opacity-50 hover:bg-[#6a2a8f]">
              <span *ngIf="!isSubmitting">✓ Créer l'alerte</span>
              <span *ngIf="isSubmitting">⏳ Création...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  `
})
export class ManualAlertModalComponent {
  @Input() isOpen: boolean = false;
  @Input() patientId: number = 0;
  @Output() alertCreated = new EventEmitter<Alert>();
  @Output() closed = new EventEmitter<void>();

  alertForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private alertService: AlertService
  ) {
    this.alertForm = this.fb.group({
      type: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      severity: 'MEDIUM',
      date: [this.getTodayDate(), Validators.required],
      time: [this.getCurrentTime(), Validators.required],
      notifyDoctor: false
    });
  }

  selectSeverity(severity: 'MEDIUM' | 'HIGH' | 'CRITICAL'): void {
    this.alertForm.patchValue({ severity });
  }

  onSubmit(): void {
    if (!this.alertForm.valid || this.patientId === 0) return;

    this.isSubmitting = true;
    const formValue = this.alertForm.value;
    const notifyDoctor = formValue.notifyDoctor; // Extract notify flag
    
    // Combine date and time
    const dateTimeString = `${formValue.date}T${formValue.time}:00`;
    const createdAt = new Date(dateTimeString).toISOString();

    // Create alert object
    const newAlert: Alert = {
      id: Math.floor(Math.random() * 10000), // Temporary ID
      patientId: this.patientId,
      patientName: '', // Will be populated by service
      type: formValue.type,
      severity: formValue.severity,
      title: this.getTitleFromType(formValue.type),
      description: formValue.description,
      status: 'UNREAD',
      read: false,
      createdAt,
      createdBy: 'CAREGIVER', // Current user role
      isManual: true // Mark as manually created
    };

    // Call service to create alert with notify flag
    this.alertService.createManualAlert(newAlert, notifyDoctor)
      .subscribe({
        next: (createdAlert: Alert) => {
          this.isSubmitting = false;
          this.alertCreated.emit(createdAlert);
        },
        error: (error: unknown) => {
          this.isSubmitting = false;
          console.error('Error creating alert:', error);
          alert('Erreur lors de la création de l\'alerte');
        }
      });
  }

  onClose(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    this.closed.emit();
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private getCurrentTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private getTitleFromType(type: string): string {
    const titles: Record<string, string> = {
      MEDICATION_MISSED: 'Alerte médicament manqué',
      SAFETY: 'Alerte de sécurité',
      COGNITIVE_DECLINE: 'Alerte déclin cognitif',
      CAREGIVER_BURNOUT: 'Alerte épuisement soignant',
      REMINDER_MISSED: 'Rappel manqué',
      WELLBEING: 'Alerte bien-être',
      MANUAL: 'Alerte manuelle'
    };
    return titles[type] || 'Alerte';
  }
}
