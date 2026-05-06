import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PatientAssignment {
  id: number;
  patientId: number;
  patientName: string;
  patientPrenom: string;
  caregiverId: number;
  status: 'accepted' | 'pending' | 'rejected';
  isPrimary: boolean;
  assignedDate: string;
}

export interface Reminder {
  id: number;
  patientId: number;
  type: 'medication' | 'appointment' | 'activity' | 'test' | 'meal' | 'hygiene' | 'walk' | 'other';
  title: string;
  description?: string;
  scheduledTime: string; // ISO 8601
  status: 'pending' | 'confirmed' | 'confirmed_late' | 'planned' | 'missed' | 'canceled' | 'rescheduled' | 'delayed';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReminderStats {
  medicationAdherence: number; // 0-100
  activityAdherence: number; // 0-100
  totalReminders: number;
  confirmedCount: number;
  missedCount: number;
  delayedCount: number;
  forgetfulnessTrend: { date: string; count: number }[];
}

export interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  type: 'medication' | 'appointment' | 'activity' | 'test';
  backgroundColor: string;
  borderColor: string;
  status: string;
  reminderId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PlanningService {
  private readonly apiUrl = `${environment.apiUrl}/api`;
  private remindersSubject$ = new BehaviorSubject<Reminder[]>([]);
  public reminders$ = this.remindersSubject$.asObservable();

  private statsSubject$ = new BehaviorSubject<ReminderStats | null>(null);
  public stats$ = this.statsSubject$.asObservable();

  constructor(private http: HttpClient) {}

  // ===== CAREGIVER ENDPOINTS =====

  /**
   * Récupère les patients assignés à l'aidant.
   * Passe userId ET userEmail pour robustesse (si l'un est undefined, l'autre prend le relais).
   */
  getMyPatients(userId: number, userEmail?: string): Observable<PatientAssignment[]> {
    let params = new HttpParams();
    // N'ajouter userId que s'il est défini et valide
    if (userId != null && !isNaN(userId)) {
      params = params.set('userId', userId.toString());
    }
    // Fallback email
    if (userEmail) {
      params = params.set('userEmail', userEmail);
    }
    return this.http.get<any[]>(`${this.apiUrl}/caregivers/my-patients`, { params }).pipe(
      map(list => (list || []).map(item => ({
        id:             item.id,
        patientId:      item.patientId,
        patientName:    item.patientName   || '',
        patientPrenom:  item.patientPrenom || '',
        caregiverId:    item.caregiverId,
        status:         (item.status || 'accepted') as 'accepted' | 'pending' | 'rejected',
        isPrimary:      item.isPrimary || false,
        assignedDate:   item.assignedDate || '',
        age:            item.age,
        initials:       item.initials || '',
        alzheimerStage: item.alzheimerStage || 'LEGER',
        adherenceRate:  item.adherenceRate || 0,
      } as PatientAssignment)))
    );
  }

  /**
   * Normalise un rappel reçu du backend :
   * - Convertit status/type/priority en minuscules pour compatibilité frontend
   */
  private normalizeReminder(r: any): Reminder {
    return {
      ...r,
      id: r.id ?? r.idReminder,
      status: (r.status || 'pending').toLowerCase() as Reminder['status'],
      type: (r.type || 'other').toLowerCase() as Reminder['type'],
      priority: (r.priority || 'normal').toLowerCase() as Reminder['priority'],
    };
  }

  /**
   * Récupère tous les rappels d'un patient pour une date donnée
   */
  getPatientReminders(patientId: number, date?: string): Observable<Reminder[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<any[]>(
      `${this.apiUrl}/patients/${patientId}/reminders`,
      { params }
    ).pipe(
      map(reminders => (reminders || []).map(r => this.normalizeReminder(r))),
      tap(reminders => this.remindersSubject$.next(reminders))
    );
  }

  /**
   * Récupère les événements calendrier pour le mois
   */
  getCalendarEvents(patientId: number, startDate: string, endDate: string): Observable<CalendarEvent[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<CalendarEvent[]>(
      `${this.apiUrl}/patients/${patientId}/calendar-events`,
      { params }
    );
  }

  /**
   * Récupère les statistiques d'observance du patient.
   * Normalise la réponse backend pour garantir que tous les champs attendus
   * par le frontend sont bien présents (avec valeurs par défaut si null).
   */
  getAdherenceStats(patientId: number, days: number = 30): Observable<ReminderStats> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<any>(
      `${this.apiUrl}/patients/${patientId}/stats/adherence`,
      { params }
    ).pipe(
      map(raw => this.normalizeStats(raw)),
      tap(stats => this.statsSubject$.next(stats))
    );
  }

  /** Normalise la réponse backend AdherenceStatsDTO → ReminderStats frontend */
  private normalizeStats(raw: any): ReminderStats {
    if (!raw) {
      return {
        medicationAdherence: 0,
        activityAdherence: 0,
        totalReminders: 0,
        confirmedCount: 0,
        missedCount: 0,
        delayedCount: 0,
        forgetfulnessTrend: []
      };
    }
    // Fallback : si medicationAdherence est null, utiliser overallRate
    const medAdherence = raw.medicationAdherence != null
      ? raw.medicationAdherence
      : (raw.overallRate != null ? raw.overallRate : 0);
    const actAdherence = raw.activityAdherence != null
      ? raw.activityAdherence
      : (raw.overallRate != null ? raw.overallRate : 0);

    return {
      medicationAdherence: Math.round(medAdherence),
      activityAdherence:   Math.round(actAdherence),
      totalReminders:      raw.totalReminders   ?? 0,
      confirmedCount:      raw.confirmedCount   ?? (raw.confirmed ?? 0),
      missedCount:         raw.missedCount      ?? 0,
      delayedCount:        raw.delayedCount     ?? 0,
      forgetfulnessTrend:  Array.isArray(raw.forgetfulnessTrend) ? raw.forgetfulnessTrend : []
    };
  }

  /**
   * Marque un rappel comme confirmé
   */
  confirmReminder(reminderId: number, patientId?: number): Observable<Reminder> {
    const url = patientId
      ? `${this.apiUrl}/patients/${patientId}/reminders/${reminderId}/confirm`
      : `${this.apiUrl}/planning/reminders/${reminderId}/confirm`;
    return this.http.patch<any>(url, {}).pipe(
      map(r => this.normalizeReminder(r))
    );
  }

  /**
   * Supprime un rappel
   * Utilise /api/patients/reminders/{id} (PatientRestController)
   */
  deleteReminder(reminderId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/patients/reminders/${reminderId}`);
  }

  /**
   * Crée un nouveau rappel
   */
  createReminder(patientId: number, reminder: Partial<Reminder>): Observable<Reminder> {
    return this.http.post<any>(
      `${this.apiUrl}/patients/${patientId}/reminders`,
      reminder
    ).pipe(map(r => this.normalizeReminder(r)));
  }

  /**
   * Reporte un rappel à un nouvelle date/heure
   * Utilise /api/patients/reminders/{id}/delay
   */
  delayReminder(reminderId: number, newTime: string): Observable<Reminder> {
    return this.http.patch<Reminder>(
      `${this.apiUrl}/patients/reminders/${reminderId}/delay`,
      { newScheduledTime: newTime }
    );
  }

  /**
   * Reporte automatiquement les rappels non confirmés
   */
  autoDelayPendingReminders(patientId: number): Observable<{ count: number; message: string }> {
    return this.http.post<{ count: number; message: string }>(
      `${this.apiUrl}/patients/${patientId}/reminders/auto-delay`,
      {}
    );
  }

  // ===== PATIENT ENDPOINTS =====

  /**
   * Récupère le planning du jour pour le patient
   */
  getTodayReminders(patientId: number): Observable<Reminder[]> {
    return this.getPatientReminders(patientId, new Date().toISOString().split('T')[0]);
  }

  /**
   * Confirme un rappel (endpoint simplifié pour patients)
   */
  confirmReminderForPatient(reminderId: number): Observable<Reminder> {
    return this.confirmReminder(reminderId);
  }

  /**
   * Exporte le planning hebdo en PDF
   */
  exportWeeklyPlanningPDF(patientId: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/patients/${patientId}/planning/export-pdf`,
      { responseType: 'blob' }
    );
  }

  /**
   * Marque une activité comme complétée avec notes
   */
  completeActivity(reminderId: number, notes?: string): Observable<Reminder> {
    return this.http.patch<Reminder>(
      `${this.apiUrl}/reminders/${reminderId}/complete`,
      { notes }
    );
  }

  /**
   * Récupère les rappels pour un patient à une date donnée (compatible avec patient-planning)
   * @param patientId ID du patient
   * @param date Date au format YYYY-MM-DD
   */
  getReminders(patientId: number, date: string): Observable<any[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<any[]>(
      `${this.apiUrl}/patients/${patientId}/reminders`,
      { params }
    ).pipe(
      map(reminders => reminders.map(r => ({
        id: r.id,
        patientId: r.patientId,
        type: r.type || 'other',
        label: r.title || r.label,
        notes: r.description || r.notes,
        time: this.extractTime(r.scheduledTime),
        status: r.status || 'pending',
        priority: (r.priority || 'normal').toLowerCase(),
        scheduledTime: r.scheduledTime
      })))
    );
  }

  /**
   * Extrait l'heure au format HH:mm d'une date ISO
   */
  private extractTime(isoDate: string): string {
    if (!isoDate) return '00:00';
    const date = new Date(isoDate);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
