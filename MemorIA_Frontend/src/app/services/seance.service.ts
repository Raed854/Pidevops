import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Seance } from '../models/seance.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SeanceService {
  private apiUrl = `${environment.apiUrl}/api/seances`;

  constructor(private http: HttpClient) { }

  getAllSeances(): Observable<Seance[]> {
    return this.http.get<Seance[]>(this.apiUrl);
  }

  getSeancesByActivite(activiteId: number): Observable<Seance[]> {
    return this.http.get<Seance[]>(`${this.apiUrl}/activite/${activiteId}`);
  }

  getAvailableSeances(): Observable<Seance[]> {
    return this.http.get<Seance[]>(`${this.apiUrl}/disponibles`);
  }

  createSeance(seance: Seance): Observable<Seance> {
    return this.http.post<Seance>(this.apiUrl, seance);
  }

  deleteSeance(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
