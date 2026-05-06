import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Alert, AlertRole } from '../../models/alert.model';
import { AlertCardComponent } from '../components/alert-card-redesigned.component';

@Component({
  selector: 'app-alert-list',
  standalone: true,
  imports: [CommonModule, AlertCardComponent],
  template: `
    <section class="space-y-3">
      <ng-container *ngIf="alerts.length; else emptyState">
        <app-alert-card
          *ngFor="let alert of alerts; trackBy: trackById"
          [alert]="alert"
          (takeInCharge)="takeInCharge.emit(alert)"
          (resolve)="resolve.emit(alert)"
          (addNote)="addNote.emit(alert)">
        </app-alert-card>
      </ng-container>

      <ng-template #emptyState>
        <div class="rounded-xl border border-dashed border-[#C0E0DE] bg-white p-8 text-center text-[#7E7F9A]">
          No alerts for this filter.
        </div>
      </ng-template>
    </section>
  `
})
export class AlertListComponent {
  @Input({ required: true }) alerts: Alert[] = [];

  @Output() takeInCharge = new EventEmitter<Alert>();
  @Output() resolve = new EventEmitter<Alert>();
  @Output() addNote = new EventEmitter<Alert>();

  trackById(_: number, alert: Alert): number {
    return alert.id;
  }
}

