import { Reminder, ReminderStatus, ReminderType } from './reminder.model';
import { Patient } from './patient.model';

/**
 * Modèle étendú pour le calendrier du médecin
 */
export interface DayEvent {
  id: number;
  title: string;
  type: ReminderType;
  startTime: string;
  endTime?: string;
  status: ReminderStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  description?: string;
  notes?: string;
  isRecurring: boolean;
}

/**
 * Vue calendar pour un mois avec états
 */
export interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: DayEvent[];
  hasAlert: boolean; // si statut critique ou non fait
  completionRate: number; // % rappels complétés pour ce jour
}

/**
 * Vue semaine
 */
export interface CalendarWeek {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: CalendarDay[];
}

/**
 * Événement détaillé pour le jour choisi
 */
export interface DayDetailView {
  date: Date;
  patientId: number;
  events: ReminderWithActions[];
  totalEvents: number;
  completedCount: number;
  completionRate: number;
}

/**
 * Rappel avec actions possibles
 */
export interface ReminderWithActions extends Reminder {
  canMarkDone: boolean;
  canReschedule: boolean;
  canDelete: boolean;
  canAddNote: boolean;
  isLate: boolean; // l'heure a passé mais statut non complet
  minutesOverdue?: number;
}

/**
 * Statistiques d'observance
 */
export interface AdherenceMetrics {
  period30days: {
    overallRate: number;
    byType: TypeAdherence[];
    timeline: TimelineData[];
  };
  period90days: {
    overallRate: number;
    byType: TypeAdherence[];
    timeline: TimelineData[];
  };
  recentMissed: Reminder[];
}

export interface TypeAdherence {
  type: ReminderType;
  completed: number;
  total: number;
  rate: number;
  color: string; // couleur pour le graphique
}

export interface TimelineData {
  date: string | Date;
  rate: number;
}

/**
 * État global du composant de planning
 */
export interface PlanningState {
  selectedPatient: Patient | null;
  viewType: 'month' | 'week' | 'day';
  currentDate: Date;
  selectedDate: Date | null;
  isAddingReminder: boolean;
  isDayDetailOpen: boolean;
  isLoading: boolean;
  error: string | null;
  remindersForSelectedDate: ReminderWithActions[];
  adherenceMetrics: AdherenceMetrics | null;
}
