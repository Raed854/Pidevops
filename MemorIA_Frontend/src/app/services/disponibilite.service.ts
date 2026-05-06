import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DisponibilitePayload {
  date: string;       // YYYY-MM-DD
  heureDebut: string; // HH:MM:SS
  heureFin: string;   // HH:MM:SS
  statut: 'LIBRE' | 'RESERVE';
  userId: number;
}

export interface DisponibiliteResponse {
  id: number;
  date: string;
  heureDebut: string;
  heureFin: string;
  statut: 'LIBRE' | 'RESERVE';
  user?: { id: number };
  patient?: { id: number; nom: string; prenom: string } | null;
}

@Injectable({
  providedIn: 'root'
})
export class DisponibiliteService {
  private readonly apiUrl = `${environment.apiUrl}/api/disponibilites`;

  constructor(private readonly http: HttpClient) {}

  create(payload: DisponibilitePayload): Observable<DisponibiliteResponse> {
    return this.http.post<DisponibiliteResponse>(this.apiUrl, payload);
  }

  getByUser(userId: number): Observable<DisponibiliteResponse[]> {
    return this.http.get<DisponibiliteResponse[]>(`${this.apiUrl}/user/${userId}`);
  }

  getLibre(): Observable<DisponibiliteResponse[]> {
    return this.http.get<DisponibiliteResponse[]>(`${this.apiUrl}?statut=LIBRE`);
  }

  update(id: number, payload: DisponibilitePayload): Observable<DisponibiliteResponse> {
    return this.http.put<DisponibiliteResponse>(`${this.apiUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
