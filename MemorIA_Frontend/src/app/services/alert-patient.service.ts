import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AlertPatientResponse {
  idAlerte: number;
  dateAlerte: string;
  alert: string;
  lu: boolean;
  idTraitement: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlertPatientService {
  private readonly apiUrl = `${environment.apiUrl}/api/alerts`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<AlertPatientResponse[]> {
    return this.http.get<AlertPatientResponse[]>(this.apiUrl);
  }

  getByTraitement(idTraitement: number): Observable<AlertPatientResponse[]> {
    return this.http.get<AlertPatientResponse[]>(`${this.apiUrl}/traitement/${idTraitement}`);
  }

  getUnread(idTraitement: number): Observable<AlertPatientResponse[]> {
    return this.http.get<AlertPatientResponse[]>(`${this.apiUrl}/traitement/${idTraitement}/unread`);
  }

  getUnreadCount(idTraitement: number): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/traitement/${idTraitement}/unread/count`);
  }

  markAsRead(idAlerte: number): Observable<AlertPatientResponse> {
    return this.http.patch<AlertPatientResponse>(`${this.apiUrl}/${idAlerte}/read`, {});
  }

  markAllAsRead(idTraitement: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/traitement/${idTraitement}/read-all`, {});
  }
}
