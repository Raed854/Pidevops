import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Patient } from '../models/patient.model';
import { Reminder, ReminderStatus, ReminderType, CreateReminderRequest } from '../models/reminder.model';
import { AdherenceMetrics } from '../models/doctor-planning.model';
import { environment } from '../../environments/environment';

export interface AdherenceStats {
  patientId: number;
  period: number;
  overallRate: number;
  byCategory: any;
  timeline: any[];
  recentMissed: Reminder[];
}

@Injectable({
  providedIn: 'root'
})
export class DoctorPlanningService {

  private readonly baseUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  // ========== PATIENTS ==========

  getPatients(doctorId?: number): Observable<Patient[]> {
    const effectiveDoctorId = doctorId ?? 1;
    const currentUserUrl = `${this.baseUrl}/patients/current-user`;
    const doctorUrl = `${this.baseUrl}/patients/doctor/${effectiveDoctorId}`;

    return this.http.get<any[]>(currentUserUrl).pipe(
      map((dtos) => this.mapPatients(dtos)),
      catchError((currentUserError) => {
        console.warn('[DoctorPlanningService] /patients/current-user failed, fallback to /patients/doctor/{id}', currentUserError);
        return this.http.get<any[]>(doctorUrl).pipe(
          map((dtos) => this.mapPatients(dtos)),
          catchError((doctorError) => {
            console.error('[DoctorPlanningService] Failed to load patients from backend.', doctorError);
            return of([]);
          })
        );
      })
    );
  }

  private mapPatients(dtos: any[]): Patient[] {
    return (dtos ?? []).map((dto) => {
      const user = dto?.user ?? {};
      const firstName = dto?.firstName ?? dto?.prenom ?? user?.prenom ?? '';
      const lastName = dto?.lastName ?? dto?.nom ?? user?.nom ?? '';

      return {
        id: dto?.id,
        nom: lastName,
        prenom: firstName,
        age: dto?.age ?? 0,
        initials: dto?.initials || `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase(),
        stage: this.normalizeStage(dto?.stage),
        adherenceRate: dto?.adherencePercentage ?? dto?.adherenceRate ?? 0,
        actif: dto?.actif ?? user?.actif ?? true,
        numberOfAlerts: dto?.numberOfAlerts ?? dto?.unresolvedAlerts ?? 0,
        nextAppointment: dto?.nextAppointment
          ? (typeof dto.nextAppointment === 'string'
              ? dto.nextAppointment
              : new Date(dto.nextAppointment).toISOString())
          : null,
        dateNaissance: dto?.dateNaissance,
        adresse: dto?.adresse,
        ville: dto?.ville,
        groupeSanguin: dto?.groupeSanguin,
        mutuelle: dto?.mutuelle,
        numeroPoliceMutuelle: dto?.numeroPoliceMutuelle,
        numeroSecuriteSociale: dto?.numeroSecuriteSociale,
        dossierMedicalPath: dto?.dossierMedicalPath,
        sexe: dto?.sexe
      } as Patient;
    });
  }

  private normalizeStage(rawStage: unknown): Patient['stage'] {
    const stage = String(rawStage ?? '').toUpperCase();
    if (stage === 'MODERATE' || stage === 'MODERE') {
      return 'MODERE';
    }
    if (stage === 'ADVANCED' || stage === 'AVANCE') {
      return 'AVANCE';
    }
    return 'LEGER';
  }

  getPatient(patientId: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseUrl}/patients/${patientId}`);
  }

  searchPatients(term: string, doctorId: number = 1): Observable<Patient[]> {
    const params = new HttpParams()
      .set('term', term)
      .set('doctorId', doctorId.toString());
    return this.http.get<Patient[]>(`${this.baseUrl}/patients/search`, { params });
  }

  // ========== REMINDERS ==========

  getPatientReminders(
    patientId: number,
    startDate: Date,
    endDate: Date
  ): Observable<Reminder[]> {
    const params = new HttpParams()
      .set('startDate', this.formatDate(startDate))
      .set('endDate', this.formatDate(endDate));

    return this.http.get<any[]>(
      `${this.baseUrl}/doctor-planning/reminders/patient/${patientId}`,
      { params }
    ).pipe(
      map(dtos => dtos.map(dto => this.mapDtoToReminder(dto)))
    );
  }

  /** Mappe le DTO backend → interface Reminder Angular */
  private mapDtoToReminder(dto: any): Reminder {
    // reminderDate peut venir de dto.reminderDate ou extraire de dto.scheduledTime
    let reminderDate = dto.reminderDate;
    let reminderTime = dto.reminderTime;

    if (!reminderDate && dto.scheduledTime) {
      reminderDate = (dto.scheduledTime as string).substring(0, 10);
    }
    if (!reminderTime && dto.scheduledTime) {
      reminderTime = (dto.scheduledTime as string).substring(11, 16);
    }

    return {
      idReminder:           dto.id ?? dto.idReminder,
      title:                dto.title ?? '',
      description:          dto.description,
      type:                 dto.type as any,
      reminderDate:         reminderDate ?? '',
      reminderTime:         reminderTime,
      durationMinutes:      dto.durationMinutes,
      status:               (dto.status?.toUpperCase()) as any ?? 'PENDING',
      priority:             (dto.priority?.toUpperCase()) as any ?? 'NORMAL',
      criticalityLevel:     dto.criticalityLevel,
      isRecurring:          dto.isRecurring ?? false,
      recurrenceType:       dto.recurrenceType ?? 'NONE',
      recurrenceEndDate:    dto.recurrenceEndDate,
      notificationChannels: dto.notificationChannels ?? [],
      patientId:            dto.patientId,
      createdById:          dto.createdById ?? 1,
      notes:                dto.notes,
      createdAt:            dto.createdAt,
      updatedAt:            dto.updatedAt,
      isActive:             dto.isActive ?? true
    };
  }

  createReminder(reminder: Reminder): Observable<Reminder> {
    return this.http.post<Reminder>(`${this.baseUrl}/doctor-planning/reminders`, reminder);
  }

  /**
   * Crée un rappel (avec gestion récurrence) via POST /api/doctor-planning/reminders/with-recurrence.
   * Retourne la réponse du backend contenant count + reminders.
   */
  createReminderFromDTO(dto: CreateReminderRequest): Observable<{ count: number; reminders: Reminder[]; message: string }> {
    return this.http.post<{ count: number; reminders: Reminder[]; message: string }>(
      `${this.baseUrl}/doctor-planning/reminders/with-recurrence`,
      dto
    );
  }

  updateReminder(reminder: Reminder): Observable<Reminder> {
    return this.http.put<Reminder>(
      `${this.baseUrl}/doctor-planning/reminders/${reminder.idReminder}`,
      reminder
    );
  }

  deleteReminder(reminderId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/doctor-planning/reminders/${reminderId}`);
  }

  confirmReminder(reminderId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/doctor-planning/reminders/${reminderId}/confirm`,
      {}
    );
  }

  delayReminder(reminderId: number, newDate: string, newTime: string): Observable<Reminder> {
    return this.http.patch<Reminder>(
      `${this.baseUrl}/doctor-planning/reminders/${reminderId}/delay`,
      { newDate, newTime }
    );
  }

  // ========== ADHERENCE STATS ==========

  getAdherenceStats(patientId: number, period: number = 30): Observable<AdherenceMetrics> {
    const params = new HttpParams().set('period', period.toString());
    return this.http.get<any>(
      `${this.baseUrl}/doctor-planning/adherence/patient/${patientId}`,
      { params }
    ).pipe(
      map(raw => this.transformAdherenceStats(raw))
    );
  }

  /**
   * Transforme la réponse brute du backend (AdherenceStatsDTO)
   * au format AdherenceMetrics attendu par le frontend
   */
  private transformAdherenceStats(raw: any): AdherenceMetrics {
    // byCategory est un objet Map JSON : { "MEDICATION": { type, total, completed, rate }, ... }
    // On le convertit en tableau byType pour le frontend
    const byType = raw.byCategory
      ? Object.values(raw.byCategory).map((cat: any) => ({
          type: cat.type as ReminderType,
          completed: cat.completed ?? 0,
          total: cat.total ?? 0,
          rate: cat.rate ?? 0,
          color: '#541A75'
        }))
      : [];

    const timeline = (raw.timeline ?? []).map((t: any) => ({
      date: t.date,
      rate: t.rate ?? 0
    }));

    const recentMissed = raw.recentMissed ?? [];

    return {
      period30days: {
        overallRate: raw.overallRate ?? 0,
        byType,
        timeline
      },
      period90days: {
        overallRate: raw.overallRate ?? 0,
        byType,
        timeline
      },
      recentMissed
    };
  }

  // ========== HELPERS ==========

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getStatusLabel(status: ReminderStatus): string {
    const labels: Record<ReminderStatus, string> = {
      [ReminderStatus.PLANNED]: 'Planifié',
      [ReminderStatus.PENDING]: 'En attente',
      [ReminderStatus.CONFIRMED]: 'Confirmé',
      [ReminderStatus.CONFIRMED_LATE]: 'Confirmé (retard)',
      [ReminderStatus.MISSED]: 'Manqué',
      [ReminderStatus.CANCELED]: 'Annulé',
      [ReminderStatus.RESCHEDULED]: 'Reporté'
    };
    return labels[status] || status;
  }

  getStatusColor(status: ReminderStatus): string {
    const colors: Record<ReminderStatus, string> = {
      [ReminderStatus.CONFIRMED]: '#00635D',
      [ReminderStatus.CONFIRMED_LATE]: '#00635D',
      [ReminderStatus.PENDING]: '#FFC107',
      [ReminderStatus.PLANNED]: '#7E7F9A',
      [ReminderStatus.MISSED]: '#CB1527',
      [ReminderStatus.CANCELED]: '#999',
      [ReminderStatus.RESCHEDULED]: '#541A75'
    };
    return colors[status] || '#999';
  }

  getTypeLabel(type: ReminderType): string {
    const labels: Record<ReminderType, string> = {
      [ReminderType.MEDICATION]: 'Médicament',
      [ReminderType.MEDICATION_VITAL]: 'Médicament vital',
      [ReminderType.MEAL]: 'Repas',
      [ReminderType.PHYSICAL_ACTIVITY]: 'Activité physique',
      [ReminderType.HYGIENE]: 'Hygiène',
      [ReminderType.MEDICAL_APPOINTMENT]: 'RDV médical',
      [ReminderType.VITAL_SIGNS]: 'Signes vitaux',
      [ReminderType.COGNITIVE_TEST]: 'Test cognitif',
      [ReminderType.FAMILY_CALL]: 'Appel famille',
      [ReminderType.WALK]: 'Promenade',
      [ReminderType.SLEEP_ROUTINE]: 'Routine sommeil',
      [ReminderType.HYDRATION]: 'Hydratation',
      [ReminderType.OTHER]: 'Autre'
    };
    return labels[type] || type;
  }

  getTypeColor(type: ReminderType): string {
    const colors: Record<ReminderType, string> = {
      [ReminderType.MEDICATION]: '#541A75',
      [ReminderType.MEDICATION_VITAL]: '#CB1527',
      [ReminderType.MEAL]: '#FF9800',
      [ReminderType.PHYSICAL_ACTIVITY]: '#4CAF50',
      [ReminderType.HYGIENE]: '#2196F3',
      [ReminderType.MEDICAL_APPOINTMENT]: '#00635D',
      [ReminderType.VITAL_SIGNS]: '#E91E63',
      [ReminderType.COGNITIVE_TEST]: '#9C27B0',
      [ReminderType.FAMILY_CALL]: '#3F51B5',
      [ReminderType.WALK]: '#8BC34A',
      [ReminderType.SLEEP_ROUTINE]: '#673AB7',
      [ReminderType.HYDRATION]: '#00BCD4',
      [ReminderType.OTHER]: '#7E7F9A'
    };
    return colors[type] || '#7E7F9A';
  }
}
