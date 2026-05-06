import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CalendarViewComponent } from '../calendar_view/calendar_view.component';
import { StatsPanelComponent } from '../stats-panel/stats-panel.component';
import { DayDetailModalComponent } from '../day-detail-modal/day-detail-modal.component';
import { ReminderFormModalComponent } from '../reminder-form-modal/reminder-form-modal.component';
import { NavbarComponent } from '../../../../components/navbare/navbare.component';
import { SidebarDiagnosticComponent } from '../../../../components/sidebar_diagnostic/sidebar_diagnostic.component';
import { Patient, AlzheimerStage } from '../../../../models/patient.model';
import { Reminder, ReminderStatus, CreateReminderRequest } from '../../../../models/reminder.model';
import { AdherenceMetrics } from '../../../../models/doctor-planning.model';
import { DoctorPlanningService } from '../../../../services/doctor-planning.service';
import { PdfExportService } from '../../../../services/pdf-export.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-doctor-planning',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NavbarComponent,
    SidebarDiagnosticComponent,
    CalendarViewComponent, StatsPanelComponent,
    DayDetailModalComponent, ReminderFormModalComponent
  ],
  templateUrl: './doctor-planning.component.html',
  styleUrls: ['./doctor-planning.component.css']
})
export class DoctorPlanningComponent implements OnInit, OnDestroy {

  // ── Patients (liste intégrée directement, sans composant externe) ──
  allPatients: Patient[] = [];
  filteredPatients: Patient[] = [];
  patientSearch = '';
  isLoadingPatients = false;
  patientsLoadError: string | null = null;

  selectedPatient: Patient | null = null;
  selectedDate: Date | null = null;

  // ── Calendrier ──
  calendarEvents: Reminder[] = [];
  currentMonth: Date = new Date();
  calendarView: 'month' | 'week' | 'day' = 'month';

  // ── Stats ──
  adherenceStats: AdherenceMetrics | null = null;

  // ── Modales ──
  showDayDetailModal = false;
  showReminderFormModal = false;
  reminderFormMode: 'create' | 'edit' = 'create';
  selectedReminder: Reminder | null = null;
  editingReminder: Reminder | null = null;

  isLoadingCalendar = false;
  isLoadingStats    = false;
  isExportingPdf    = false; // export rapport PDF patient

  /** Getter alias pour forcer la résolution dans les templates */
  get exportingPdf(): boolean { return this.isExportingPdf; }

  /** Palette couleurs avatars — déterministe par patient.id % 8 */
  private readonly AVATAR_COLORS = [
    '#541A75','#00635D','#1565C0','#6A1B9A',
    '#00838F','#AD1457','#558B2F','#E65100'
  ];

  private destroy$ = new Subject<void>();
  private search$  = new Subject<string>();

  private readonly doctorId: number;

  constructor(
    private planningService: DoctorPlanningService,
    private pdfExportService: PdfExportService,
    private authService: AuthService
  ) {
    this.doctorId = this.authService.getUser()?.id ?? 1;
  }

  ngOnInit(): void {
    this.loadPatients();
    // Recherche avec debounce 250ms pour éviter les appels excessifs
    this.search$.pipe(
      debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$)
    ).subscribe(term => this.applyFilter(term));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ════════════════════════════════════════
  // GESTION PATIENTS
  // ════════════════════════════════════════

  /** Charge les patients depuis l'API */
  loadPatients(): void {
    this.isLoadingPatients = true;
    this.patientsLoadError = null;

    this.planningService.getPatients(this.doctorId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (pts: Patient[]) => {
        this.allPatients = pts;
        this.filteredPatients = [...pts];
        this.isLoadingPatients = false;

        if (pts.length === 0) {
          this.patientsLoadError = 'No patient found for this doctor in database.';
          return;
        }

        // Auto-select first patient so calendar/stats populate immediately.
        if (!this.selectedPatient) {
          this.onPatientSelected(pts[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load doctor patients from backend.', err);
        this.allPatients = [];
        this.filteredPatients = [];
        this.isLoadingPatients = false;
        this.patientsLoadError = 'Unable to load patients from database. Check backend API.';
      }
    });
  }

  onSearchChange(term: string): void { this.search$.next(term); }

  private applyFilter(term: string): void {
    const t = term.toLowerCase().trim();
    this.filteredPatients = t
      ? this.allPatients.filter(p =>
          p.nom.toLowerCase().includes(t) || p.prenom.toLowerCase().includes(t))
      : [...this.allPatients];
  }

  onPatientSelected(patient: Patient): void {
    this.selectedPatient  = patient;
    this.showDayDetailModal = false;
    this.loadPatientCalendar(patient.id);
    this.loadPatientStats(patient.id);
  }

  // ════════════════════════════════════════
  // CALENDRIER
  // ════════════════════════════════════════

  loadPatientCalendar(patientId: number): void {
    this.isLoadingCalendar = true;
    const startDate = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const endDate   = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
    this.planningService.getPatientReminders(patientId, startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (events) => { this.calendarEvents = events; this.isLoadingCalendar = false; },
        error: ()       => { this.isLoadingCalendar = false; }
      });
  }

  loadPatientStats(patientId: number): void {
    this.isLoadingStats = true;
    this.planningService.getAdherenceStats(patientId, 30)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => { this.adherenceStats = stats; this.isLoadingStats = false; },
        error: ()      => { this.isLoadingStats = false; }
      });
  }

  // Reminders du jour sélectionné (pour le modal)
  dayReminders: Reminder[] = [];
  isLoadingDay = false;

  onDayClicked(date: Date): void {
    this.selectedDate = date;
    this.showDayDetailModal = true;
    // Charger spécifiquement les reminders du jour via l'API dédiée
    if (this.selectedPatient) {
      this.loadDayReminders(this.selectedPatient.id, date);
    }
  }

  loadDayReminders(patientId: number, date: Date): void {
    this.isLoadingDay = true;
    // Utiliser la plage d'un seul jour
    const start = new Date(date); start.setHours(0,0,0,0);
    const end   = new Date(date); end.setHours(23,59,59,999);
    this.planningService.getPatientReminders(patientId, start, end)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reminders) => {
          this.dayReminders = reminders;
          this.isLoadingDay = false;
        },
        error: () => {
          // Fallback : filtrer depuis calendarEvents déjà chargés
          const dateStr = this.formatDateStr(date);
          this.dayReminders = this.calendarEvents.filter(r =>
            r.reminderDate && r.reminderDate.substring(0, 10) === dateStr
          );
          this.isLoadingDay = false;
        }
      });
  }

  private formatDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  onMonthChanged(date: Date): void {
    this.currentMonth = date;
    if (this.selectedPatient) this.loadPatientCalendar(this.selectedPatient.id);
  }

  onViewChanged(view: 'month' | 'week' | 'day'): void { this.calendarView = view; }

  // ════════════════════════════════════════
  // RAPPELS
  // ════════════════════════════════════════

  openAddReminderModal(): void {
    if (!this.selectedPatient) return;
    this.editingReminder = null;
    this.selectedReminder = null;
    this.reminderFormMode = 'create';
    this.showReminderFormModal = true;
  }

  onAddReminderRequested(date: Date): void {
    this.selectedDate = date;
    this.openAddReminderModal();
  }

  onSaveReminder(request: CreateReminderRequest): void {
    if (!this.selectedPatient) return;

    // Assurer que patientId est bien renseigné
    request.patientId = this.selectedPatient.id;
    request.createdById = this.doctorId;

    // Utiliser le nouvel endpoint avec support récurrence
    this.planningService.createReminderFromDTO(request).subscribe({
      next: (response) => {
        this.showReminderFormModal = false;
        this.showDayDetailModal    = false;
        // Recharger le calendrier pour afficher les dots des occurrences générées
        this.loadPatientCalendar(this.selectedPatient!.id);
        this.loadPatientStats(this.selectedPatient!.id);
        const msg = response.count > 1
          ? `${response.count} rappels créés (récurrence activée)`
          : 'Rappel créé avec succès';
        console.info('✅', msg);
      },
      error: (e) => {
        console.error('Erreur création rappel:', e);
        // Fallback sur l'ancien endpoint si le nouveau n'est pas encore déployé
        const legacyReminder: Reminder = {
          title:          request.title,
          type:           request.type,
          reminderDate:   request.reminderDate,
          reminderTime:   request.reminderTime,
          durationMinutes: request.durationMinutes,
          priority:       request.priority ?? 'NORMAL' as any,
          status:         'PLANNED' as any,
          isRecurring:    request.recurrenceType !== 'NONE',
          recurrenceType: request.recurrenceType,
          patientId:      request.patientId,
          createdById:    this.doctorId,
          isActive:       true
        };
        this.planningService.createReminder(legacyReminder).subscribe({
          next: (created) => {
            this.calendarEvents = [...this.calendarEvents, created];
            this.showReminderFormModal = false;
            this.loadPatientCalendar(this.selectedPatient!.id);
          }
        });
      }
    });
  }

  onDeleteReminder(reminderId: number): void {
    this.planningService.deleteReminder(reminderId).subscribe({
      next: () => this.loadPatientCalendar(this.selectedPatient!.id),
      error: (e) => console.error('Erreur delete:', e)
    });
  }

  onReminderMarkedDone(reminderId: number): void {
    this.planningService.confirmReminder(reminderId).subscribe({
      next: () => { this.loadPatientCalendar(this.selectedPatient!.id); this.loadPatientStats(this.selectedPatient!.id); },
      error: (e) => console.error('Erreur confirm:', e)
    });
  }

  onReminderUpdated(reminder: Reminder): void {
    this.planningService.updateReminder(reminder).subscribe({
      next: () => this.loadPatientCalendar(this.selectedPatient!.id),
      error: (e) => console.error('Erreur update:', e)
    });
  }

  // ════════════════════════════════════════
  // EXPORT PDF
  // ════════════════════════════════════════

  /**
   * Exporte le rapport complet du patient sélectionné en PDF.
   * Charge tous les rappels du mois affiché, puis génère le PDF.
   */
  exportPatientPdf(): void {
    if (!this.selectedPatient || this.isExportingPdf) return;
    this.isExportingPdf = true;

    const startDate = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const endDate   = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);

    this.planningService.getPatientReminders(this.selectedPatient.id, startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reminders) => {
          this.pdfExportService.exportPatientReport(
            this.selectedPatient!,
            reminders,
            this.adherenceStats,
            this.currentMonth
          );
          this.isExportingPdf = false;
        },
        error: (err) => {
          console.error('Erreur export PDF:', err);
          // Fallback : utiliser les rappels déjà en mémoire
          this.pdfExportService.exportPatientReport(
            this.selectedPatient!,
            this.calendarEvents,
            this.adherenceStats,
            this.currentMonth
          );
          this.isExportingPdf = false;
        }
      });
  }

  // ════════════════════════════════════════
  // HELPERS TEMPLATE
  // ════════════════════════════════════════

  getMissedCount(): number {
    return this.calendarEvents.filter(r => r.status === ReminderStatus.MISSED).length;
  }

  getPendingCount(): number {
    return this.calendarEvents.filter(
      r => r.status === ReminderStatus.PENDING || r.status === ReminderStatus.PLANNED
    ).length;
  }

  getAdherenceColor(rate: number): string {
    if (rate >= 80) return '#00635D';
    if (rate >= 60) return '#F59E0B';
    return '#CB1527';
  }

  getStageLabel(stage: AlzheimerStage | string): string {
    const m: Record<string, string> = { LEGER: 'Léger', MODERE: 'Modéré', AVANCE: 'Avancé' };
    return m[stage] || stage;
  }

  /** Couleur d'avatar déterministe — évite que deux patients adjacents aient la même couleur */
  getAvatarColor(patient: Patient): string {
    return this.AVATAR_COLORS[patient.id % this.AVATAR_COLORS.length];
  }
}

