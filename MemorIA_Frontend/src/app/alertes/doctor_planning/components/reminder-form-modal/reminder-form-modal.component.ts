import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Patient, ReminderEvent } from '../../../../models/patient.model';
import {
  ReminderType, Priority,
  RecurrenceType, NotificationChannel, CreateReminderRequest
} from '../../../../models/reminder.model';

@Component({
  selector: 'app-reminder-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reminder-form-modal.component.html',
  styleUrls: ['./reminder-form-modal.component.css']
})
export class ReminderFormModalComponent implements OnInit {

  @Input() patient!: Patient;
  @Input() selectedDate?: Date;
  @Input() reminderMode: 'create' | 'edit' = 'create';
  @Input() selectedReminder?: ReminderEvent | null;
  @Input() caregiver: { id: number; prenom: string; nom: string; email?: string } | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() reminderAdded = new EventEmitter<CreateReminderRequest>();

  // ── Enums exposés au template ─────────────────────────────────────────────
  readonly ReminderType     = ReminderType;
  readonly RecurrenceType   = RecurrenceType;
  readonly NotificationChannel = NotificationChannel;

  // ── Données statiques ─────────────────────────────────────────────────────

  /** Reminder types with icon, label and accent color */
  readonly reminderTypeOptions = [
    { value: ReminderType.MEDICATION,         label: 'Medication',          icon: 'fas fa-pills',        color: '#541A75' },
    { value: ReminderType.MEDICATION_VITAL,   label: 'Critical Med.',       icon: 'fas fa-capsules',     color: '#CB1527' },
    { value: ReminderType.MEAL,               label: 'Meal',               icon: 'fas fa-utensils',     color: '#00635D' },
    { value: ReminderType.PHYSICAL_ACTIVITY,  label: 'Activity',           icon: 'fas fa-running',      color: '#7E7F9A' },
    { value: ReminderType.HYGIENE,            label: 'Hygiene',            icon: 'fas fa-shower',       color: '#C0E0DE' },
    { value: ReminderType.MEDICAL_APPOINTMENT,label: 'Medical Apt.',       icon: 'fas fa-stethoscope',  color: '#541A75' },
    { value: ReminderType.VITAL_SIGNS,        label: 'Vital Signs',        icon: 'fas fa-heartbeat',    color: '#CB1527' },
    { value: ReminderType.COGNITIVE_TEST,     label: 'Cognitive Test',     icon: 'fas fa-brain',        color: '#7E7F9A' },
    { value: ReminderType.FAMILY_CALL,        label: 'Family Call',        icon: 'fas fa-phone',        color: '#00635D' },
    { value: ReminderType.WALK,               label: 'Walk',              icon: 'fas fa-walking',      color: '#C0E0DE' },
    { value: ReminderType.SLEEP_ROUTINE,      label: 'Sleep',             icon: 'fas fa-moon',         color: '#541A75' },
    { value: ReminderType.HYDRATION,          label: 'Hydration',         icon: 'fas fa-tint',         color: '#00635D' },
    { value: ReminderType.OTHER,              label: 'Other',             icon: 'fas fa-bookmark',     color: '#7E7F9A' }
  ];

  /** Priority levels */
  readonly priorityOptions = [
    { value: Priority.LOW,    label: 'Low',      icon: '🟢', color: '#00635D' },
    { value: Priority.NORMAL, label: 'Normal',   icon: '🔵', color: '#7E7F9A' },
    { value: Priority.HIGH,   label: 'High',     icon: '🟠', color: '#FF8C00' },
    { value: Priority.URGENT, label: 'Urgent',   icon: '🔴', color: '#CB1527' }
  ];

  /**
   * Recurrence options with visual description.
   * Each option explains how dots will appear in the calendar.
   */
  readonly recurrenceOptions = [
    {
      value: RecurrenceType.NONE,
      label: 'Once',
      icon: 'fas fa-calendar-day',
      description: 'Single reminder on selected date',
      dotPreview: 1
    },
    {
      value: RecurrenceType.DAILY,
      label: 'Daily',
      icon: 'fas fa-calendar-alt',
      description: 'Every day at same time',
      dotPreview: 7
    },
    {
      value: RecurrenceType.WEEKLY,
      label: 'Weekly',
      icon: 'fas fa-calendar-week',
      description: 'Every week on same day',
      dotPreview: 4
    },
    {
      value: RecurrenceType.MONTHLY,
      label: 'Monthly',
      icon: 'fas fa-calendar',
      description: 'Each month on same date',
      dotPreview: 3
    }
  ];

  /**
   * Notification channels — each can be toggled independently
   */
  readonly channelOptions = [
    { value: NotificationChannel.SMS,        label: 'SMS',         icon: 'fas fa-sms',           desc: 'Text message',     color: '#00635D' },
    { value: NotificationChannel.EMAIL,      label: 'Email',       icon: 'fas fa-envelope',      desc: 'Email',            color: '#7E7F9A' }
  ];

  // ── Formulaire réactif ────────────────────────────────────────────────────
  form!: FormGroup;
  isSubmitting = false;
  notifyPatient = true;
  notifyCaregiver = false;

  /** Canaux sélectionnés (Set pour toggle O(1)) */
  selectedChannels = new Set<NotificationChannel>();

  /** Dates de prévisualisation générées pour la récurrence */
  previewDates: string[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildForm();
    this.initializeValues();
    this.notifyCaregiver = !!this.caregiver;
    // Recalcule la prévisualisation quand date ou récurrence change
    this.form.get('reminderDate')!.valueChanges.subscribe(() => this.updatePreview());
    this.form.get('recurrenceType')!.valueChanges.subscribe(() => this.updatePreview());
  }

  // ── Construction du formulaire ────────────────────────────────────────────

  private buildForm(): void {
    this.form = this.fb.group({
      type:             [ReminderType.MEDICATION, Validators.required],
      title:            ['', [Validators.required, Validators.minLength(3)]],
      description:      [''],
      reminderDate:     ['', Validators.required],
      reminderTime:     ['', Validators.required],
      durationMinutes:  [30, [Validators.min(5), Validators.max(480)]],
      priority:         [Priority.NORMAL],
      criticalityLevel: [null],
      recurrenceType:   [RecurrenceType.NONE],
      recurrenceEndDate:[''],
      instructions:     ['']
    });
  }

  private initializeValues(): void {
    const now = new Date();
    const dateStr = (this.selectedDate ?? now).toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    if (this.reminderMode === 'edit' && this.selectedReminder) {
      this.form.patchValue({
        type:            this.selectedReminder.type,
        title:           this.selectedReminder.title,
        description:     this.selectedReminder.description,
        reminderDate:    this.selectedReminder.reminderDate,
        reminderTime:    this.selectedReminder.reminderTime,
        durationMinutes: this.selectedReminder.durationMinutes ?? 30,
        priority:        this.selectedReminder.priority
      });
    } else {
      this.form.patchValue({ reminderDate: dateStr, reminderTime: timeStr });
      // Email activé par défaut
      this.selectedChannels.add(NotificationChannel.EMAIL);
    }
    this.updatePreview();
  }

  // ── Gestion des canaux de notification ───────────────────────────────────

  toggleChannel(channel: NotificationChannel): void {
    if (this.selectedChannels.has(channel)) {
      this.selectedChannels.delete(channel);
    } else {
      this.selectedChannels.add(channel);
    }
  }

  isChannelActive(channel: NotificationChannel): boolean {
    return this.selectedChannels.has(channel);
  }

  toggleNotifyPatient(): void {
    this.notifyPatient = !this.notifyPatient;
  }

  toggleNotifyCaregiver(): void {
    if (!this.caregiver) {
      return;
    }
    this.notifyCaregiver = !this.notifyCaregiver;
  }

  // ── Prévisualisation des dates récurrentes ────────────────────────────────

  /**
   * Calcule les prochaines dates de la série récurrente pour affichage.
   * Génère au maximum 5 dates pour la prévisualisation.
   */
  updatePreview(): void {
    const dateStr = this.form.get('reminderDate')?.value;
    const recType = this.form.get('recurrenceType')?.value as RecurrenceType;

    if (!dateStr || recType === RecurrenceType.NONE) {
      this.previewDates = [];
      return;
    }

    const base = new Date(dateStr);
    const dates: string[] = [];
    const MAX = 5;

    for (let i = 1; i <= MAX; i++) {
      const d = new Date(base);
      if (recType === RecurrenceType.DAILY)        d.setDate(base.getDate() + i);
      else if (recType === RecurrenceType.WEEKLY)  d.setDate(base.getDate() + i * 7);
      else if (recType === RecurrenceType.MONTHLY) d.setMonth(base.getMonth() + i);

      dates.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
    }
    this.previewDates = dates;
  }

  get isRecurring(): boolean {
    return this.form.get('recurrenceType')?.value !== RecurrenceType.NONE;
  }

  get selectedRecurrenceOption() {
    const v = this.form.get('recurrenceType')?.value;
    return this.recurrenceOptions.find(o => o.value === v) ?? this.recurrenceOptions[0];
  }

  get dotPreviewArray(): number[] {
    return Array(Math.min(this.selectedRecurrenceOption.dotPreview, 7)).fill(0);
  }

  // ── Helpers template ──────────────────────────────────────────────────────

  getTypeOption(type: ReminderType | string) {
    return this.reminderTypeOptions.find(o => o.value === type);
  }

  getPriorityOption(p: Priority | string) {
    return this.priorityOptions.find(o => o.value === p);
  }

  hasError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  getErrorMessage(field: string): string {
    const c = this.form.get(field);
    if (!c) return '';
    if (c.hasError('required'))  return 'This field is required';
    if (c.hasError('minlength')) return `Minimum ${c.errors?.['minlength'].requiredLength} characters`;
    if (c.hasError('min'))       return 'Value too low';
    if (c.hasError('max'))       return 'Value too high';
    return 'Validation error';
  }

  getModalTitle(): string {
    return this.reminderMode === 'edit' ? 'Edit Reminder' : 'Create a New Reminder';
  }

  // ── Soumission ────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => c.markAsTouched());
      return;
    }

    this.isSubmitting = true;
    const v = this.form.value;

    // Normaliser l'heure en HH:mm:ss
    let time: string = v.reminderTime || '00:00:00';
    if (time.length === 5) time += ':00';

    const request: CreateReminderRequest = {
      patientId:            this.patient.id,
      title:                v.title,
      type:                 v.type,
      reminderDate:         v.reminderDate,
      reminderTime:         time,
      durationMinutes:      v.durationMinutes ? parseInt(v.durationMinutes) : 30,
      priority:             v.priority || Priority.NORMAL,
      criticalityLevel:     v.criticalityLevel ?? undefined,
      description:          v.description || undefined,
      instructions:         v.instructions || undefined,
      // ── Récurrence ─────────────────────────────────────────────────────
      recurrenceType:       v.recurrenceType || RecurrenceType.NONE,
      recurrenceEndDate:    v.recurrenceEndDate || undefined,
      // ── Canaux ─────────────────────────────────────────────────────────
      notificationChannels: Array.from(this.selectedChannels),
      notifyPatient:        this.notifyPatient,
      notifyCaregiver:      this.notifyCaregiver && !!this.caregiver,
      caregiverId:          this.caregiver?.id,
      createdById:          1
    };

    setTimeout(() => {
      this.reminderAdded.emit(request);
      this.isSubmitting = false;
    }, 300);
  }

  closeModal(): void {
    this.close.emit();
  }
}
