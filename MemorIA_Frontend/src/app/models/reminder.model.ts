export interface Reminder {
  idReminder?: number;
  title: string;
  description?: string;
  type: ReminderType;
  reminderDate: string;
  reminderTime?: string;
  durationMinutes?: number;
  status: ReminderStatus;
  priority: Priority;
  criticalityLevel?: number;
  isRecurring: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceEndDate?: string;
  notificationChannels?: NotificationChannel[];
  patientId: number;
  createdById: number;
  confirmedById?: number;
  confirmationTime?: string;
  isLateConfirmation?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive: boolean;
  deletedAt?: string;
}

/**
 * DTO de création envoyé au backend POST /api/reminders
 */
export interface CreateReminderRequest {
  patientId: number;
  title: string;
  type: ReminderType;
  reminderDate: string;            // yyyy-MM-dd
  reminderTime: string;            // HH:mm:ss
  durationMinutes?: number;
  priority?: Priority;
  criticalityLevel?: number;
  description?: string;
  instructions?: string;           // stocke dans notes
  recurrenceType: RecurrenceType;  // NONE par defaut
  recurrenceEndDate?: string;      // yyyy-MM-dd
  notificationChannels: NotificationChannel[];
  // Destinataires des notifications
  notifyPatient?: boolean;
  notifyCaregiver?: boolean;
  caregiverId?: number;
  createdById?: number;
}

export enum ReminderType {
  MEDICATION = 'MEDICATION',
  MEDICATION_VITAL = 'MEDICATION_VITAL',
  MEAL = 'MEAL',
  PHYSICAL_ACTIVITY = 'PHYSICAL_ACTIVITY',
  HYGIENE = 'HYGIENE',
  MEDICAL_APPOINTMENT = 'MEDICAL_APPOINTMENT',
  VITAL_SIGNS = 'VITAL_SIGNS',
  COGNITIVE_TEST = 'COGNITIVE_TEST',
  FAMILY_CALL = 'FAMILY_CALL',
  WALK = 'WALK',
  SLEEP_ROUTINE = 'SLEEP_ROUTINE',
  HYDRATION = 'HYDRATION',
  OTHER = 'OTHER'
}

export enum ReminderStatus {
  PLANNED = 'PLANNED',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CONFIRMED_LATE = 'CONFIRMED_LATE',
  MISSED = 'MISSED',
  CANCELED = 'CANCELED',
  RESCHEDULED = 'RESCHEDULED'
}

export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Type de récurrence du rappel
 * NONE    = rappel unique
 * DAILY   = quotidien (tous les jours à la même heure)
 * WEEKLY  = hebdomadaire (même jour de semaine)
 * MONTHLY = mensuel (même jour du mois)
 */
export enum RecurrenceType {
  NONE    = 'NONE',
  DAILY   = 'DAILY',
  WEEKLY  = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

/**
 * Canaux de notification activables indépendamment
 */
export enum NotificationChannel {
  PUSH       = 'PUSH',
  SMS        = 'SMS',
  EMAIL      = 'EMAIL',
  VOICE_CALL = 'VOICE_CALL'
}
