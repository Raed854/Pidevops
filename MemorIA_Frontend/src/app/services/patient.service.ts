import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PatientSignupData } from '../models/signup.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly apiUrl = `${environment.apiUrl}/api/patients`;

  constructor(private readonly http: HttpClient) {}

  getProfile(userId: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/profile/${userId}`);
  }

  saveProfile(userId: number, payload: PatientSignupData): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/profile/${userId}`, payload);
  }

  uploadMedicalFile(patientId: number, file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<unknown>(`${this.apiUrl}/${patientId}/dossier-medical`, formData);
  }
}
