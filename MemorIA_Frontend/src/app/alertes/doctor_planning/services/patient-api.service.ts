import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Patient } from '../../../models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class PatientApiService {

  private readonly apiUrl = '/api/patients';
  private patientsSubject = new BehaviorSubject<Patient[]>([]);
  public patients$ = this.patientsSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Récupère tous les patients
   */
  getAllPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl)
      .pipe(
        tap(patients => this.patientsSubject.next(patients)),
        catchError(error => {
          console.error('Erreur lors de la récupération des patients', error);
          throw error;
        })
      );
  }

  /**
   * Récupère un patient par son ID
   */
  getPatientById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la récupération du patient', error);
          throw error;
        })
      );
  }

  /**
   * Crée un nouveau patient
   */
  createPatient(patient: Patient): Observable<Patient> {
    return this.http.post<Patient>(this.apiUrl, patient)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la création du patient', error);
          throw error;
        })
      );
  }

  /**
   * Met à jour un patient
   */
  updatePatient(id: number, patient: Patient): Observable<Patient> {
    return this.http.put<Patient>(`${this.apiUrl}/${id}`, patient)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la mise à jour du patient', error);
          throw error;
        })
      );
  }

  /**
   * Supprime un patient
   */
  deletePatient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la suppression du patient', error);
          throw error;
        })
      );
  }

  /**
   * Récupère le profil du patient par userId
   */
  getPatientProfile(userId: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/profile/${userId}`)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la récupération du profil', error);
          throw error;
        })
      );
  }
}
