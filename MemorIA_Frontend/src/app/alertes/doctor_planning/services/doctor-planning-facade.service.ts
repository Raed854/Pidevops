import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { map, tap, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PatientApiService } from './patient-api.service';
import { ReminderApiService } from './reminder-api.service';
import { DoctorPlanningService } from '../../../services/doctor-planning.service';
import { AuthService } from '../../../services/auth.service';
import { Patient, ReminderEvent, AdherenceStats } from '../../../models/patient.model';
import { Reminder, ReminderStatus } from '../../../models/reminder.model';

/**
 * Service façade - Coordonne tous les appels API pour le Planning Médecin
 * Centralise la logique métier et gère l'orchestration des données
 */
@Injectable({
  providedIn: 'root'
})
export class DoctorPlanningFacadeService {

  // Services
  private patientApiService = inject(PatientApiService);
  private reminderApiService = inject(ReminderApiService);
  private doctorPlanningService = inject(DoctorPlanningService);
  private authService = inject(AuthService);

  // BehaviorSubjects pour états réactifs
  private patientsSubject = new BehaviorSubject<Patient[]>([]);
  private selectedPatientSubject = new BehaviorSubject<Patient | null>(null);
  private remindersSubject = new BehaviorSubject<Reminder[]>([]);
  private adherenceStatsSubject = new BehaviorSubject<AdherenceStats | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Observables publics
  public patients$ = this.patientsSubject.asObservable();
  public selectedPatient$ = this.selectedPatientSubject.asObservable();
  public reminders$ = this.remindersSubject.asObservable();
  public adherenceStats$ = this.adherenceStatsSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  private doctoId: number = 1; // TODO: Récupérer depuis AuthService

  constructor() {
    this.initializeDoctorId();
  }

  /**
   * Récupère l'ID du médecin connecté
   */
  private initializeDoctorId(): void {
    const user = this.authService.getUser();
    if (user && user.id) {
      this.doctoId = user.id;
    }
  }

  /**
   * Charge la liste des patients du médecin avec toutes les métriques
   */
  loadPatients(): Observable<Patient[]> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.patientApiService.getAllPatients()
      .pipe(
        map((patients: any[]) => {
          // Enrichir les données des patients
          return patients.map((p: any) => this.enrichPatientData(p));
        }),
        tap((patients: Patient[]) => {
          this.patientsSubject.next(patients);
          // Auto-sélectionner le premier patient
          if (patients.length > 0) {
            this.selectPatient(patients[0]);
          }
          this.isLoadingSubject.next(false);
        }),
        catchError((error) => {
          const errorMsg = 'Erreur lors du chargement des patients';
          this.errorSubject.next(errorMsg);
          this.isLoadingSubject.next(false);
          console.error(errorMsg, error);
          return of([]);
        })
      );
  }

  /**
   * Enrich les données patient avec des champs calculés
   */
  private enrichPatientData(patient: any): Patient {
    return {
      id: patient.id,
      nom: patient.nom || '',
      prenom: patient.prenom || '',
      age: this.calculateAge(patient.dateNaissance),
      stage: patient.stage || 'LEGER',
      adherenceRate: patient.adherenceRate || 0,
      nextAppointment: patient.nextAppointment || null,
      actif: patient.actif !== false,
      initials: ((patient.prenom?.[0] || 'P') + (patient.nom?.[0] || 'X')).toUpperCase(),
      photo: patient.photo || null,
      lastUpdated: new Date()
    };
  }

  /**
   * Calcule l'âge à partir de la date de naissance
   */
  private calculateAge(dateNaissance: string): number {
    if (!dateNaissance) return 0;
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }

  /**
   * Sélectionne un patient et charge ses données associées
   */
  selectPatient(patient: Patient): void {
    this.selectedPatientSubject.next(patient);
    this.loadPatientData(patient.id);
  }

  /**
   * Charge tous les rappels et stats du patient sélectionné
   */
  private loadPatientData(patientId: number): void {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.isLoadingSubject.next(true);

    // Charger rappels et stats en parallèle
    forkJoin({
      reminders: this.reminderApiService.getPatientReminders(patientId, startOfMonth, endOfMonth),
      stats: this.reminderApiService.getAdherenceStats(patientId, 30)
    }).subscribe({
      next: (data) => {
        this.remindersSubject.next(data.reminders);
        this.adherenceStatsSubject.next(data.stats);
        this.isLoadingSubject.next(false);
      },
      error: (error) => {
        const errorMsg = 'Erreur lors du chargement des données du patient';
        this.errorSubject.next(errorMsg);
        this.isLoadingSubject.next(false);
        console.error(errorMsg, error);
      }
    });
  }

  /**
   * Cherche des patients par terme
   */
  searchPatients(searchTerm: string): Observable<Patient[]> {
    if (!searchTerm.trim()) {
      return this.patients$;
    }

    return this.patients$.pipe(
      map((patients: Patient[]) => {
        const term = searchTerm.toLowerCase();
        return patients.filter(p =>
          p.nom.toLowerCase().includes(term) ||
          p.prenom.toLowerCase().includes(term)
        );
      })
    );
  }

  /**
   * ╔══════════════════════════════════════════════════════════════╗
   * ║          GESTION DES RAPPELS / REMINDERS                    ║
   * ╚══════════════════════════════════════════════════════════════╝
   */

  /**
   * Récupère les rappels d'un patient pour une période
   */
  getPatientReminders(patientId: number, startDate: Date, endDate: Date): Observable<Reminder[]> {
    return this.reminderApiService.getPatientReminders(patientId, startDate, endDate)
      .pipe(
        tap((reminders) => this.remindersSubject.next(reminders)),
        catchError((error) => {
          console.error('Erreur chargement rappels', error);
          return of([]);
        })
      );
  }

  /**
   * Récupère les rappels d'un jour spécifique
   */
  getPatientRemindersByDate(patientId: number, date: Date): Observable<Reminder[]> {
    return this.reminderApiService.getPatientRemindersByDate(patientId, date);
  }

  /**
   * Crée un nouveau rappel (avec gestion récurrence)
   */
  createReminder(reminder: any): Observable<Reminder> {
    // Ajouter l'ID du médecin connecté
    reminder.createdById = this.doctoId;

    return this.reminderApiService.createReminder(reminder)
      .pipe(
        tap(() => {
          // Recharger les données après création
          const selected = this.selectedPatientSubject.getValue();
          if (selected) {
            this.loadPatientData(selected.id);
          }
        }),
        catchError((error) => {
          this.errorSubject.next('Erreur création du rappel');
          console.error('Erreur création rappel', error);
          throw error;
        })
      );
  }

  /**
   * Met à jour un rappel existant
   */
  updateReminder(reminderId: number, reminder: any): Observable<Reminder> {
    return this.reminderApiService.updateReminder(reminderId, reminder)
      .pipe(
        tap(() => {
          const selected = this.selectedPatientSubject.getValue();
          if (selected) {
            this.loadPatientData(selected.id);
          }
        }),
        catchError((error) => {
          this.errorSubject.next('Erreur mise à jour du rappel');
          console.error('Erreur update rappel', error);
          throw error;
        })
      );
  }

  /**
   * Supprime un rappel
   */
  deleteReminder(reminderId: number): Observable<void> {
    return this.reminderApiService.deleteReminder(reminderId)
      .pipe(
        tap(() => {
          const selected = this.selectedPatientSubject.getValue();
          if (selected) {
            this.loadPatientData(selected.id);
          }
        }),
        catchError((error) => {
          this.errorSubject.next('Erreur suppression du rappel');
          console.error('Erreur delete rappel', error);
          throw error;
        })
      );
  }

  /**
   * Marque un rappel comme confirmé
   */
  markReminderAsConfirmed(reminderId: number): Observable<void> {
    return this.reminderApiService.markAsConfirmed(reminderId)
      .pipe(
        tap(() => {
          const selected = this.selectedPatientSubject.getValue();
          if (selected) {
            this.loadPatientData(selected.id);
          }
        }),
        catchError((error) => {
          console.error('Erreur marquage confirmé', error);
          throw error;
        })
      );
  }

  /**
   * Marque un rappel comme manqué
   */
  markReminderAsMissed(reminderId: number): Observable<void> {
    return this.reminderApiService.markAsMissed(reminderId)
      .pipe(
        tap(() => {
          const selected = this.selectedPatientSubject.getValue();
          if (selected) {
            this.loadPatientData(selected.id);
          }
        })
      );
  }

  /**
   * Marque un rappel comme annulé
   */
  markReminderAsCanceled(reminderId: number, reason?: string): Observable<void> {
    return this.reminderApiService.markAsCanceled(reminderId, reason)
      .pipe(
        tap(() => {
          const selected = this.selectedPatientSubject.getValue();
          if (selected) {
            this.loadPatientData(selected.id);
          }
        })
      );
  }

  /**
   * ╔══════════════════════════════════════════════════════════════╗
   * ║         GESTION DES STATISTIQUES / ADHERENCE                ║
   * ╚══════════════════════════════════════════════════════════════╝
   */

  /**
   * Récupère les stats d'adhérence d'un patient
   */
  getAdherenceStats(patientId: number, period: 30 | 90 = 30): Observable<AdherenceStats> {
    return this.reminderApiService.getAdherenceStats(patientId, period)
      .pipe(
        tap((stats) => this.adherenceStatsSubject.next(stats)),
        catchError((error) => {
          console.error('Erreur chargement stats adhérence', error);
          return of(null as any);
        })
      );
  }

  /**
   * Met à jour les stats d'adhérence (côté backend)
   */
  updateAdherenceStats(patientId: number): Observable<void> {
    return this.reminderApiService.updateAdherence(patientId)
      .pipe(
        tap(() => this.getAdherenceStats(patientId)),
        catchError((error) => {
          console.error('Erreur mise à jour adhérence', error);
          return of(void 0);
        })
      );
  }

  /**
   * ╔══════════════════════════════════════════════════════════════╗
   * ║                UTILITAIRES ET HELPERS                        ║
   * ╚══════════════════════════════════════════════════════════════╝
   */

  /**
   * Génère les jours du calendrier pour affichage mois
   */
  generateMonthCalendar(date: Date): any {
    // Return a simple month view structure
    const month = date.getMonth();
    const year = date.getFullYear();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    return {
      year,
      month,
      startDate: firstDay,
      endDate: lastDay,
      days: []
    };
  }

  /**
   * Convertit les rappels en événements pour affichage
   */
  convertRemindersToEvents(reminders: Reminder[]): any[] {
    return reminders.map(r => ({
      id: r.patientId,
      title: `Rappel`,
      status: r.status,
      type: 'reminder'
    }));
  }

  /**
   * Enrichit les rappels avec les actions disponibles
   */
  enrichRemindersWithActions(reminders: Reminder[], currentDate: Date): Reminder[] {
    return reminders;
  }

  /**
   * Récupère la couleur pour un type de rappel
   */
  getTypeColor(type: string): string {
    return this.doctorPlanningService.getTypeColor(type as any);
  }

  /**
   * Récupère la couleur pour un statut
   */
  getStatusColor(status: ReminderStatus): string {
    return this.doctorPlanningService.getStatusColor(status);
  }

  /**
   * Récupère le label du statut
   */
  getStatusLabel(status: ReminderStatus): string {
    return this.doctorPlanningService.getStatusLabel(status);
  }

  /**
   * Récupère le label du type
   */
  getTypeLabel(type: string): string {
    return this.doctorPlanningService.getTypeLabel(type as any);
  }

  /**
   * Nettoie les erreurs
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Retourne l'état actuel des patients
   */
  getCurrentPatients(): Patient[] {
    return this.patientsSubject.getValue();
  }

  /**
   * Retourne le patient sélectionné actuel
   */
  getCurrentSelectedPatient(): Patient | null {
    return this.selectedPatientSubject.getValue();
  }

  /**
   * Retourne les rappels actuels
   */
  getCurrentReminders(): Reminder[] {
    return this.remindersSubject.getValue();
  }

  /**
   * Retourne les stats actuelles
   */
  getCurrentStats(): AdherenceStats | null {
    return this.adherenceStatsSubject.getValue();
  }
}
