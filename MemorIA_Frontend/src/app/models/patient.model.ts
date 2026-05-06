import { ReminderType, ReminderStatus, Priority } from './reminder.model';

export interface Patient {
  id: number;
  nom: string;
  prenom: string;
  age: number;
  photo?: string;
  initials: string;
  stage: AlzheimerStage;
  adherenceRate: number;
  nextAppointment?: string | null;
  actif: boolean;
  numberOfAlerts?: number;
  // Champs optionnels du backend
  dateNaissance?: string;
  numeroSecuriteSociale?: string;
  adresse?: string;
  ville?: string;
  groupeSanguin?: string;
  mutuelle?: string;
  numeroPoliceMutuelle?: string;
  dossierMedicalPath?: string;
  sexe?: 'M' | 'F';
  lastUpdated?: Date;
}

export type AlzheimerStage = 'LEGER' | 'MODERE' | 'AVANCE';

export interface ReminderEvent {
  idReminder: number;
  title: string;
  description?: string;
  type: ReminderType;
  reminderDate: string;
  reminderTime: string;
  durationMinutes?: number;
  status: ReminderStatus;
  priority: Priority;
  criticalityLevel?: number;
  isRecurring: boolean;
  patientId: number;
  patientName?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  createdById?: number;
  confirmedById?: number;
  confirmationTime?: string;
  isLateConfirmation?: boolean;
}

export interface AdherenceStats {
  patientId: number;
  period: number;
  overallRate: number;
  byCategory: CategoryStats[];
  timeline: TimelinePoint[];
  recentMissed: ReminderEvent[];
}

export interface CategoryStats {
  type: string;
  rate: number;
  completed: number;
  total: number;
  label?: string;
  icon?: string;
  color?: string;
}

export interface TimelinePoint {
  date: string;
  rate: number;
  completed?: number;
  total?: number;
}

/**
 * Données pour formulaire création/modification rappel
 */
export interface ReminderFormData {
  title: string;
  type: ReminderType;
  reminderDate: string;
  reminderTime: string;
  priority: Priority;
  durationMinutes?: number;
  description?: string;
  notes?: string;
  isRecurring: boolean;
  recurrenceFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recurrenceEndDate?: string;
  criticalityLevel?: number;
  patientId: number;
  createdById: number;
  isActive: boolean;
}

/**
 * Résumé journalier d'adhérence
 */
export interface DailyAdherenceSummary {
  date: string;
  totalReminders: number;
  completedReminders: number;
  missedReminders: number;
  percentComplete: number;
  byType: CategoryStats[];
}

/**
 * Assignation patient à accompagnant
 */
export interface PatientAssignment {
  id: number;
  patientId: number;
  patientName: string;
  patientPrenom: string;
  caregiverId: number;
  caregiverName: string;
  isPrimary: boolean;
  role: string;
  startDate: string;
  endDate?: string;
}

/**
 * Statistiques de rappels par heure
 */
export interface ReminderTimeStats {
  hour: number;
  count: number;
  completed: number;
  pending: number;
  missed: number;
}

/**
 * Patient viewed by doctor with dashboard data
 */
export interface DoctorPatient {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  stage: 'Early' | 'Moderate' | 'Advanced';
  adherence: number;
  unresolvedAlerts: number;
  initials: string;
}

/**
 * Chat message between doctor and caregiver
 */
export interface ChatMessage {
  sender: 'doctor' | 'caregiver';
  text: string;
  createdAt: Date;
}

/**
 * Dashboard data for a patient
 */
export interface PatientDashboardData {
  weeklyLabels: string[];
  weeklyAlertCount: number[];
  topTypes: Array<{ label: string; count: number }>;
  resolutionRate: number;
  monthlyLabels: string[];
  monthlyAlertCount: number[];
  monthlyObservance: number[];
}
