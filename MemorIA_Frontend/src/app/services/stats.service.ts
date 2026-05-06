import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class StatsService {
    // Utilisation de environment.apiUrl pour la cohérence avec les autres services.
    private api = `${environment.apiUrl}/api/stats`;

    constructor(private http: HttpClient) { }

    /**
     * Récupère les stats d'un utilisateur accompagnant.
     */
    getUserStats(userId: number): Observable<any> {
        return this.http.get<any>(`${this.api}/user/${userId}`);
    }

    /**
     * Récupère les données pour le graphique d'activité.
     */
    getActivityChart(): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/activity`);
    }

    /**
     * Stats pour le médecin (alias vers l'activité globale).
     */
    getDoctorStats(): Observable<any> {
        return this.http.get<any>(`${this.api}/activity`);
    }

    getStats(): Observable<any> {
        return this.getDoctorStats();
    }
}

