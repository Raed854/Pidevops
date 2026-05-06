import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import localeFr from '@angular/common/locales/fr';

// Register French locale
registerLocaleData(localeFr);
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Patient } from '../../../models/patient.model';
import { DoctorPlanningService } from '../../../services/doctor-planning.service';
import { ReminderApiService } from '../services/reminder-api.service';
import { PatientApiService } from '../services/patient-api.service';
import { PatientListComponent } from './patient-list/patient-list.component';
import { CalendarViewComponent } from './calendar_view/calendar_view.component';
import { DayDetailModalComponent } from './day-detail-modal/day-detail-modal.component';
import { ReminderFormModalComponent } from './reminder-form-modal/reminder-form-modal.component';
import { StatsPanelComponent } from './stats-panel/stats-panel.component';
import { NavbarComponent } from '../../../components/navbare/navbare.component';
import { SidebarDiagnosticComponent } from '../../../components/sidebar_diagnostic/sidebar_diagnostic.component';
import { Reminder, ReminderStatus, CreateReminderRequest } from '../../../models/reminder.model';
import { AdherenceMetrics } from '../../../models/doctor-planning.model';
import { PdfExportService } from '../../../services/pdf-export.service';

@Component({
  selector: 'app-doctor-planning-legacy',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NavbarComponent,
    SidebarDiagnosticComponent,
    PatientListComponent,
    CalendarViewComponent,
    DayDetailModalComponent,
    ReminderFormModalComponent,
    StatsPanelComponent
  ],
  templateUrl: './doctor-planning.component.html',
  styleUrls: ['./doctor-planning.component.css']
})
export class DoctorPlanningComponent implements OnInit, OnDestroy {

  // ===== STATE =====
  selectedPatient: Patient | null = null;
  isLoadingCalendar = false;
  isLoadingStats    = false;
  isExportingPdf    = false;

  currentMonth  = new Date();
  calendarView: 'month' | 'week' | 'day' = 'month';
  calendarEvents: Reminder[] = [];

  adherenceStats: AdherenceMetrics | null = null;

  showDayDetailModal    = false;
  showReminderFormModal = false;
  selectedDate: Date | null    = null;
  editingReminder: Reminder | null = null;

  private destroy$ = new Subject<void>();

  private reminderApiService = inject(ReminderApiService);
  private patientApiService = inject(PatientApiService);
  private planningService = inject(DoctorPlanningService);
  private pdfExportService = inject(PdfExportService);

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== PATIENT =====
  onPatientSelected(patient: Patient): void {
    this.selectedPatient = patient;
    this.currentMonth = new Date();
    this.loadCalendarEvents();
    this.loadAdherenceStats();
  }

  // ===== CALENDAR =====
  private loadCalendarEvents(): void {
    if (!this.selectedPatient) return;
    this.isLoadingCalendar = true;
    const startDate = this.getStartDate();
    const endDate   = this.getEndDate();
    this.reminderApiService.getPatientReminders(this.selectedPatient.id, startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reminders) => { this.calendarEvents = reminders; this.isLoadingCalendar = false; },
        error: ()          => { this.isLoadingCalendar = false; }
      });
  }

  onDayClicked(date: Date): void {
    this.selectedDate = date;
    this.showDayDetailModal = true;
  }

  onMonthChanged(date: Date): void {
    this.currentMonth = date;
    this.loadCalendarEvents();
  }

  onViewChanged(view: 'month' | 'week' | 'day'): void {
    this.calendarView = view;
  }

  // ===== REMINDER MODAL =====
  openAddReminderModal(): void {
    if (!this.selectedPatient) return;
    this.editingReminder = this.createEmptyReminder();
    this.showReminderFormModal = true;
  }

  onAddReminderRequested(date: Date): void {
    this.selectedDate = date;
    this.editingReminder = this.createEmptyReminder();
    this.editingReminder.reminderDate = this.formatDate(date);
    this.showReminderFormModal = true;
  }

  onSaveReminder(request: CreateReminderRequest): void {
    if (!this.selectedPatient) return;
    
    request.patientId = this.selectedPatient.id;
    request.createdById = 1;
    
    // Check if it's an edit or create by checking if there's an idReminder
    if ('idReminder' in request && (request as any).idReminder) {
      this.updateReminder(request as any);
    } else {
      this.createReminder(request);
    }
  }

  private createReminder(request: CreateReminderRequest): void {
    this.isLoadingCalendar = true;
    // Convert CreateReminderRequest to Reminder format expected by the API
    const reminder = request as unknown as Reminder;
    this.reminderApiService.createReminder(reminder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { this.calendarEvents.push(r); this.showReminderFormModal = false; this.isLoadingCalendar = false; this.loadAdherenceStats(); },
        error: ()  => { this.isLoadingCalendar = false; }
      });
  }

  private updateReminder(reminder: Reminder): void {
    if (!reminder.idReminder) return;
    this.isLoadingCalendar = true;
    this.reminderApiService.updateReminder(reminder.idReminder, reminder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const idx = this.calendarEvents.findIndex(r => r.idReminder === updated.idReminder);
          if (idx > -1) this.calendarEvents[idx] = updated;
          this.showReminderFormModal = false;
          this.isLoadingCalendar = false;
          this.loadAdherenceStats();
        },
        error: () => { this.isLoadingCalendar = false; }
      });
  }

  // ===== DAY DETAIL ACTIONS =====
  onReminderMarkedDone(reminderId: number): void {
    this.isLoadingCalendar = true;
    this.reminderApiService.markAsConfirmed(reminderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ()   => { this.loadCalendarEvents(); this.loadAdherenceStats(); },
        error: ()  => { this.isLoadingCalendar = false; }
      });
  }

  onDeleteReminder(reminderId: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rappel ?')) return;
    this.isLoadingCalendar = true;
    this.reminderApiService.deleteReminder(reminderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.calendarEvents = this.calendarEvents.filter(r => r.idReminder !== reminderId);
          this.showDayDetailModal = false;
          this.isLoadingCalendar = false;
          this.loadAdherenceStats();
        },
        error: () => { this.isLoadingCalendar = false; }
      });
  }

  onReminderUpdated(reminder: Reminder): void {
    this.updateReminder(reminder);
  }

  // ===== EXPORT PDF =====
  exportPatientPdf(): void {
    if (!this.selectedPatient || this.isExportingPdf) return;
    this.isExportingPdf = true;
    const startDate = this.getStartDate();
    const endDate   = this.getEndDate();
    this.reminderApiService.getPatientReminders(this.selectedPatient.id, startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reminders) => {
          this.pdfExportService.exportPatientReport(this.selectedPatient!, reminders, this.adherenceStats, this.currentMonth);
          this.isExportingPdf = false;
        },
        error: () => {
          this.pdfExportService.exportPatientReport(this.selectedPatient!, this.calendarEvents, this.adherenceStats, this.currentMonth);
          this.isExportingPdf = false;
        }
      });
  }

  // ===== STATS =====
  private loadAdherenceStats(): void {
    if (!this.selectedPatient || this.calendarEvents.length === 0) {
      this.adherenceStats = null;
      this.isLoadingStats = false;
      return;
    }
    this.isLoadingStats = true;
    const start = this.getStartDate();
    const end   = this.getEndDate();
    const relevant = this.calendarEvents.filter(e => {
      if (!e.reminderDate) return false;
      const d = new Date(e.reminderDate);
      return d >= start && d <= end;
    });
    const confirmed = relevant.filter(r => r.status === ReminderStatus.CONFIRMED).length;
    const total     = relevant.length;
    const rate      = total > 0 ? Math.round(confirmed * 100 / total) : 0;
    this.adherenceStats = {
      period30days: { overallRate: rate, byType: [], timeline: [] },
      period90days: { overallRate: rate, byType: [], timeline: [] },
      recentMissed: []
    };
    this.isLoadingStats = false;
  }

  // ===== HELPERS =====
  private createEmptyReminder(): Reminder {
    return {
      idReminder:   undefined,
      patientId:    this.selectedPatient?.id ?? 0,
      createdById:  1,
      title:        '',
      type:         'OTHER' as any,
      reminderDate: this.formatDate(new Date()),
      reminderTime: '09:00',
      priority:     'NORMAL' as any,
      status:       ReminderStatus.PENDING,
      isRecurring:  false,
      isActive:     true,
      notes:        ''
    } as Reminder;
  }

  private getStartDate(): Date {
    const d = new Date(this.currentMonth);
    d.setDate(1); d.setHours(0, 0, 0, 0);
    return d;
  }

  private getEndDate(): Date {
    const d = new Date(this.currentMonth);
    d.setMonth(d.getMonth() + 1); d.setDate(0); d.setHours(23, 59, 59, 999);
    return d;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
