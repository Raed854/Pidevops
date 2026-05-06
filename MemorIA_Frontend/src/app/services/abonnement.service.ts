import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Abonnement, TypeAbonnement } from '../models/abonnement.model';
import { environment } from '../../environments/environment';

export interface AbonnementDisplay {
  id?: number;
  accompagnantNom: string;
  accompagnantPrenom: string;
  type: string;
  seancesRestantes: number;
  seancesTotal: number;
  statut: string;
  dateDebut: string;
  dateFin: string;
}

@Injectable({
  providedIn: 'root'
})
export class AbonnementService {
  private apiUrl = `${environment.apiUrl}/api/abonnements`;

  constructor(private http: HttpClient) { }

  getActiveAbonnement(accompagnantId: number): Observable<Abonnement> {
    return this.http.get<Abonnement>(`${this.apiUrl}/actif/${accompagnantId}`);
  }

  getMesAbonnements(accompagnantId: number): Observable<Abonnement[]> {
    return this.http.get<Abonnement[]>(`${this.apiUrl}/mes-abonnements/${accompagnantId}`);
  }

  getAllAbonnements(): Observable<Abonnement[]> {
    return this.http.get<Abonnement[]>(`${this.apiUrl}/all`);
  }

  createPaymentIntent(type: TypeAbonnement, accompagnantId: number): Observable<{ clientSecret: string }> {
    return this.http.post<{ clientSecret: string }>(`${this.apiUrl}/create-payment-intent`, {
      type,
      accompagnantId: accompagnantId.toString()
    });
  }

  confirmAbonnement(type: TypeAbonnement, accompagnantId: number, paymentIntentId: string, 
                   cardNumber: string, expMonth: string, expYear: string, amount: number): Observable<Abonnement> {
    return this.http.post<Abonnement>(`${this.apiUrl}/confirm-abonnement`, {
      type,
      accompagnantId: accompagnantId.toString(),
      paymentIntentId,
      cardNumber,
      expMonth,
      expYear,
      amount: amount.toString()
    });
  }

  /** Helper: number of sessions for a given TypeAbonnement */
  getNombreSeances(type: TypeAbonnement): number {
    switch (type) {
      case TypeAbonnement.PACK_4: return 4;
      case TypeAbonnement.PACK_15: return 15;
      case TypeAbonnement.PACK_50: return 50;
    }
  }

  getPlanLabel(type: string): string {
    switch (type) {
      case 'PACK_4': return '4 séances / mois';
      case 'PACK_15': return '15 séances / 3 mois';
      case 'PACK_50': return '50 séances / 1 an';
      default: return type;
    }
  }

  getPlanPrice(type: string): number {
    switch (type) {
      case 'PACK_4': return 40;
      case 'PACK_15': return 135;
      case 'PACK_50': return 400;
      default: return 0;
    }
  }
}
