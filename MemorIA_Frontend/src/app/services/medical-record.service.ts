import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DossierMedical } from '../models/medical-record.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MedicalRecordService {
  private readonly apiUrl = `${environment.apiUrl}/api/dossiers-medicaux`;

  constructor(private readonly http: HttpClient) {}

  private headers(requesterId: number): HttpHeaders {
    return new HttpHeaders({ 'X-Requester-Id': requesterId.toString() });
  }

  getAll(requesterId: number): Observable<DossierMedical[]> {
    return this.http.get<DossierMedical[]>(this.apiUrl, { headers: this.headers(requesterId) });
  }

  getById(id: number, requesterId: number): Observable<DossierMedical> {
    return this.http.get<DossierMedical>(`${this.apiUrl}/${id}`, { headers: this.headers(requesterId) });
  }

  getByPatientId(patientId: number, requesterId: number): Observable<DossierMedical> {
    return this.http.get<DossierMedical>(`${this.apiUrl}/patient/${patientId}`, { headers: this.headers(requesterId) });
  }

  create(dossier: DossierMedical, requesterId: number): Observable<DossierMedical> {
    return this.http.post<DossierMedical>(this.apiUrl, dossier, { headers: this.headers(requesterId) });
  }

  update(id: number, dossier: DossierMedical, requesterId: number): Observable<DossierMedical> {
    return this.http.put<DossierMedical>(`${this.apiUrl}/${id}`, dossier, { headers: this.headers(requesterId) });
  }

  updateNotes(id: number, notesMedecin: string, requesterId: number): Observable<DossierMedical> {
    return this.http.patch<DossierMedical>(
      `${this.apiUrl}/${id}/notes`,
      { notesMedecin },
      { headers: this.headers(requesterId) }
    );
  }

  delete(id: number, requesterId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.headers(requesterId) });
  }
}
