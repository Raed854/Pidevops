import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Patient } from '../../../../models/patient.model';
import { Reminder, ReminderStatus } from '../../../../models/reminder.model';
import { DoctorPlanningService } from '../../../../services/doctor-planning.service';

@Component({
  selector: 'app-day-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './day-detail-modal.component.html',
  styleUrls: ['./day-detail-modal.component.css']
})
export class DayDetailModalComponent implements OnInit {

  @Input() date!: Date;
  @Input() reminders: Reminder[] = [];
  @Input() patient!: Patient;
  @Output() close = new EventEmitter<void>();
  @Output() reminderMarkedDone = new EventEmitter<number>();
  @Output() reminderDeleted = new EventEmitter<number>();
  @Output() reminderUpdated = new EventEmitter<Reminder>();
  @Output() addReminderRequested = new EventEmitter<Date>();

  editingNoteId: number | null = null;
  noteTexts: Map<number, string> = new Map();

  /** Rappels filtrés uniquement pour la date sélectionnée */
  get remindersForDay(): Reminder[] {
    if (!this.date || !this.reminders) return [];
    const dateStr = this.toDateString(this.date);
    return this.reminders.filter(r => {
      if (!r.reminderDate) return false;
      // reminderDate est toujours une string "yyyy-MM-dd" ou "yyyy-MM-ddTHH:mm"
      const rStr = (r.reminderDate as string).substring(0, 10);
      return rStr === dateStr;
    });
  }

  private toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  constructor(private planningService: DoctorPlanningService) {}

  ngOnInit(): void {
    this.remindersForDay.forEach(r => {
      if (r.idReminder && r.notes) {
        this.noteTexts.set(r.idReminder, r.notes);
      }
    });
  }

  // ========== HELPER METHODS FOR TEMPLATE ==========

  /**
   * Vérifie si un rappel peut être marqué comme fait
   */
  canMarkDone(reminder: Reminder): boolean {
    return reminder.status === ReminderStatus.PENDING ||
      reminder.status === ReminderStatus.PLANNED ||
      reminder.status === ReminderStatus.RESCHEDULED;
  }

  /**
   * Vérifie si un rappel peut être reporté
   */
  canReschedule(reminder: Reminder): boolean {
    return reminder.status === ReminderStatus.PENDING ||
      reminder.status === ReminderStatus.PLANNED;
  }

  /**
   * Vérifie si un rappel peut être supprimé
   */
  canDelete(reminder: Reminder): boolean {
    return reminder.status !== ReminderStatus.CONFIRMED &&
      reminder.status !== ReminderStatus.CONFIRMED_LATE;
  }

  // ========== EXISTING METHODS ==========

  getStatusLabel(status: ReminderStatus | undefined): string {
    if (!status) return '';
    return this.planningService.getStatusLabel(status);
  }

  getStatusColor(status: ReminderStatus | undefined): string {
    if (!status) return '#7E7F9A';
    return this.planningService.getStatusColor(status);
  }

  getTypeLabel(type: any): string {
    return this.planningService.getTypeLabel(type);
  }

  getTypeColor(type: any): string {
    return this.planningService.getTypeColor(type);
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'MEDICATION': 'fas fa-pills',
      'MEDICATION_VITAL': 'fas fa-capsules',
      'MEAL': 'fas fa-utensils',
      'PHYSICAL_ACTIVITY': 'fas fa-running',
      'HYGIENE': 'fas fa-shower',
      'MEDICAL_APPOINTMENT': 'fas fa-stethoscope',
      'VITAL_SIGNS': 'fas fa-heartbeat',
      'COGNITIVE_TEST': 'fas fa-brain',
      'FAMILY_CALL': 'fas fa-phone',
      'WALK': 'fas fa-walking',
      'SLEEP_ROUTINE': 'fas fa-moon',
      'HYDRATION': 'fas fa-tint',
      'OTHER': 'fas fa-bookmark'
    };
    return icons[type] || 'fas fa-bell';
  }

  getStatusIcon(status: ReminderStatus | string | undefined): string {
    if (!status) return 'fas fa-circle';
    const icons: Record<string, string> = {
      'CONFIRMED': 'fas fa-check-circle',
      'CONFIRMED_LATE': 'fas fa-check-circle',
      'PENDING': 'fas fa-clock',
      'PLANNED': 'fas fa-calendar-check',
      'MISSED': 'fas fa-times-circle',
      'CANCELED': 'fas fa-ban',
      'RESCHEDULED': 'fas fa-calendar-alt'
    };
    return icons[status] || 'fas fa-circle';
  }

  markDone(reminder: Reminder): void {
    if (reminder.idReminder) {
      this.reminderMarkedDone.emit(reminder.idReminder);
    }
  }

  toggleNoteEdit(reminderId: number | undefined): void {
    if (!reminderId) return;
    this.editingNoteId = this.editingNoteId === reminderId ? null : reminderId;
  }

  saveNote(reminder: Reminder): void {
    if (!reminder.idReminder) return;
    const updatedReminder: Reminder = {
      ...reminder,
      notes: this.noteTexts.get(reminder.idReminder)
    };
    this.reminderUpdated.emit(updatedReminder);
    this.editingNoteId = null;
  }

  getNoteText(reminderId: number): string {
    return this.noteTexts.get(reminderId) || '';
  }

  updateNoteText(reminderId: number, text: string): void {
    this.noteTexts.set(reminderId, text);
  }

  deleteReminder(reminderId: number | undefined): void {
    if (!reminderId || !confirm('Êtes-vous sûr de vouloir supprimer ce rappel ?')) return;
    this.reminderDeleted.emit(reminderId);
  }

  closeModal(): void {
    this.close.emit();
  }

  addReminder(): void {
    this.addReminderRequested.emit(this.date);
  }


  countByStatus(status: string): number {
    return this.remindersForDay.filter(r => r.status === status).length;
  }

  getCompletionRate(): number {
    const list = this.remindersForDay;
    if (list.length === 0) return 0;
    const completed = list.filter(r =>
      r.status === ReminderStatus.CONFIRMED || r.status === ReminderStatus.CONFIRMED_LATE
    ).length;
    return Math.round((completed / list.length) * 100);
  }

  trackByReminderId(index: number, reminder: Reminder): number {
    return reminder.idReminder || 0;
  }
}
