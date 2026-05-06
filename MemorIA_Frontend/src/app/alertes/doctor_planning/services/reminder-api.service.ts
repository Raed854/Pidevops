import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reminder } from '../../../models/reminder.model';

@Injectable({
  providedIn: 'root'
})
export class ReminderApiService {

  private readonly apiUrl = '/api/doctor-planning';
  private remindersSubject = new BehaviorSubject<Reminder[]>([]);
  public reminders$ = this.remindersSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Récupère tous les rappels d'un patient pour une période donnée
   */
  getPatientReminders(patientId: number, startDate: Date, endDate: Date): Observable<Reminder[]> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString().split('T')[0])
      .set('endDate', endDate.toISOString().split('T')[0]);

    return this.http.get<Reminder[]>(
      `${this.apiUrl}/reminders/patient/${patientId}`,
      { params }
    ).pipe(
      tap(reminders => this.remindersSubject.next(reminders)),
      catchError(error => {
        console.error('Erreur lors de la récupération des rappels', error);
        throw error;
      })
    );
  }

  /**
   * Récupère tous les rappels d'un patient pour un jour donné
   */
  getPatientRemindersByDate(patientId: number, date: Date): Observable<Reminder[]> {
    const dateStr = date.toISOString().split('T')[0];
    return this.http.get<Reminder[]>(
      `${this.apiUrl}/reminders/patient/${patientId}/date/${dateStr}`
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des rappels du jour', error);
        throw error;
      })
    );
  }

  /**
   * Récupère un rappel par son ID
   */
  getReminderById(idReminder: number): Observable<Reminder> {
    return this.http.get<Reminder>(
      `${this.apiUrl}/reminders/${idReminder}`
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération du rappel', error);
        throw error;
      })
    );
  }

  /**
   * Crée un nouveau rappel
   */
  createReminder(reminder: Reminder): Observable<Reminder> {
    return this.http.post<Reminder>(
      `${this.apiUrl}/reminders`,
      reminder
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la création du rappel', error);
        throw error;
      })
    );
  }

  /**
   * Met à jour un rappel
   */
  updateReminder(idReminder: number, reminder: Reminder): Observable<Reminder> {
    return this.http.put<Reminder>(
      `${this.apiUrl}/reminders/${idReminder}`,
      reminder
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la mise à jour du rappel', error);
        throw error;
      })
    );
  }

  /**
   * Supprime un rappel
   */
  deleteReminder(idReminder: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/reminders/${idReminder}`
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la suppression du rappel', error);
        throw error;
      })
    );
  }

  /**
   * Marque un rappel comme fait
   */
  markAsConfirmed(idReminder: number): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/reminders/${idReminder}/mark-confirmed`,
      {}
    ).pipe(
      catchError(error => {
        console.error('Erreur lors du marquage comme fait', error);
        throw error;
      })
    );
  }

  /**
   * Marque un rappel comme manqué
   */
  markAsMissed(idReminder: number): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/reminders/${idReminder}/mark-missed`,
      {}
    ).pipe(
      catchError(error => {
        console.error('Erreur lors du marquage comme manqué', error);
        throw error;
      })
    );
  }

  /**
   * Marque un rappel comme annulé
   */
  markAsCanceled(idReminder: number, reason?: string): Observable<void> {
    const params = reason ? new HttpParams().set('reason', reason) : undefined;
    return this.http.put<void>(
      `${this.apiUrl}/reminders/${idReminder}/mark-canceled`,
      {},
      { params }
    ).pipe(
      catchError(error => {
        console.error('Erreur lors du marquage comme annulé', error);
        throw error;
      })
    );
  }

  /**
   * Récupère les statistiques d'adhérence pour un patient
   */
  getAdherenceStats(patientId: number, period: number = 30): Observable<any> {
    const params = new HttpParams().set('period', period.toString());
    return this.http.get<any>(
      `${this.apiUrl}/adherence/patient/${patientId}`,
      { params }
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des stats d\'adhérence', error);
        throw error;
      })
    );
  }

  /**
   * Met à jour le taux d'adhérence d'un patient
   */
  updateAdherence(patientId: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/adherence/patient/${patientId}/update`,
      {}
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la mise à jour de l\'adhérence', error);
        throw error;
      })
    );
  }
}
