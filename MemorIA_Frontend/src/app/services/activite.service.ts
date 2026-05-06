import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Activite } from '../models/activite.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ActiviteService {
  private apiUrl = `${environment.apiUrl}/api/activites`;

  constructor(private http: HttpClient) { }

  getAllActivites(): Observable<Activite[]> {
    return this.http.get<Activite[]>(this.apiUrl);
  }

  getActivitesByDoctor(doctorId: number): Observable<Activite[]> {
    return this.http.get<Activite[]>(`${this.apiUrl}/soignant/${doctorId}`);
  }

  getActiviteById(id: number): Observable<Activite> {
    return this.http.get<Activite>(`${this.apiUrl}/${id}`);
  }

  createActivite(activite: Activite): Observable<Activite> {
    return this.http.post<Activite>(this.apiUrl, activite);
  }

  updateActivite(id: number, activite: Activite): Observable<Activite> {
    return this.http.put<Activite>(`${this.apiUrl}/${id}`, activite);
  }

  deleteActivite(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadImage(id: number, file: File): Observable<Activite> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Activite>(`${this.apiUrl}/${id}/image`, formData);
  }
}
