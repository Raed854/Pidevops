import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertSeverity, AlertType, CreateAlertRequest } from '../../models/alert.model';

@Component({
  selector: 'app-create-alert-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-[#541A75]">Create Alert</h3>
          <button type="button" class="text-slate-500" (click)="emitClose()">✕</button>
        </div>

        <form class="space-y-4" (ngSubmit)="submit()">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input
              type="text"
              [(ngModel)]="form.title"
              name="title"
              class="w-full rounded-md border border-slate-300 px-3 py-2"
              required />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              [(ngModel)]="form.description"
              name="description"
              rows="3"
              class="w-full rounded-md border border-slate-300 px-3 py-2"
              required></textarea>
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <select [(ngModel)]="form.type" name="type" class="w-full rounded-md border border-slate-300 px-3 py-2">
                <option *ngFor="let type of alertTypes" [value]="type">{{ type }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Severity</label>
              <select [(ngModel)]="form.severity" name="severity" class="w-full rounded-md border border-slate-300 px-3 py-2">
                <option *ngFor="let severity of severities" [value]="severity">{{ severity }}</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm" (click)="emitClose()" [disabled]="saving">
              Cancel
            </button>
            <button type="submit" class="rounded-md bg-[#541A75] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" [disabled]="saving">
              {{ saving ? 'Saving...' : 'Save alert' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class CreateAlertModalComponent {
  private _open = false;

  @Input()
  set open(value: boolean) {
    if (this._open && !value) {
      this.resetForm();
    }
    this._open = value;
  }

  get open(): boolean {
    return this._open;
  }

  @Input() saving = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<CreateAlertRequest>();

  readonly alertTypes: AlertType[] = [
    'MEDICATION_MISSED',
    'COGNITIVE_DECLINE',
    'CAREGIVER_BURNOUT',
    'SAFETY',
    'REMINDER_DELAY',
    'WELLBEING',
    'MANUAL'
  ];

  readonly severities: AlertSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  form: CreateAlertRequest = {
    title: '',
    description: '',
    type: 'MANUAL',
    severity: 'MEDIUM'
  };

  submit(): void {
    if (!this.form.title.trim() || !this.form.description.trim() || this.saving) {
      return;
    }

    this.save.emit({
      ...this.form,
      title: this.form.title.trim(),
      description: this.form.description.trim()
    });
  }

  emitClose(): void {
    this.close.emit();
  }

  private resetForm(): void {
    this.form = {
      title: '',
      description: '',
      type: 'MANUAL',
      severity: 'MEDIUM'
    };
  }
}
