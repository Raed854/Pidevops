import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Reservation } from '../models/reservation.model';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = `${environment.apiUrl}/api/reservations`;

  constructor(private http: HttpClient) { }

  getReservationsByAccompagnant(accompagnantId: number): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/accompagnant/${accompagnantId}`);
  }

  getReservationsByDoctor(doctorId: number): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/soignant/${doctorId}`);
  }

  reserver(seanceId: number, accompagnantId: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.apiUrl}/reserver/${seanceId}/accompagnant/${accompagnantId}`, {});
  }

  accepterReservation(id: number): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/${id}/accepter`, {});
  }

  refuserReservation(id: number): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/${id}/refuser`, {});
  }

  annulerReservation(id: number): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/${id}/annuler`, {});
  }

  marquerPresence(id: number, present: boolean): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/${id}/presence?present=${present}`, {});
  }
}
