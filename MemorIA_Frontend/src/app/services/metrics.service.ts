import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AidantMetrics {
  totalAssigned: number;
  totalCompleted: number;
  successRate: number;
  avgScoreByType: Record<string, number>;
  monthlyCounts: Record<string, number>;
}

export interface ScoreGlobal {
  globalScore: number | null;
  status: 'OK' | 'NON_EVALUABLE';
  colorCode: 'VERT' | 'JAUNE' | 'ROUGE' | null;
  interpretation: string;
  testCount: number;
  scoreByType: Record<string, number>;
  patientId: number;
  patientName: string;
}

export interface PatientAlerteSummary {
  patientId: number;
  patientNom: string;
  patientPrenom: string;
  zGlobal: number;
  colorCode: string;
}

export interface HistoriquePoint {
  date: string;
  zScore: number | null;
  scorePercentage: number | null;
  typeTest: string;
  testTitre: string;
  colorCode: string;
}

export interface PatientScoreResume {
  patientId: number;
  patientNom: string;
  patientPrenom: string;
  zGlobal: number | null;
  colorCode: string;
  tendance: 'AMELIORATION' | 'STABLE' | 'DEGRADATION';
  testCount: number;
  derniereDate: string | null;
  interpretation: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetricsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/metrics`;

  getMetricsForAidant(accompagnantId: number): Observable<AidantMetrics> {
    return this.http.get<AidantMetrics>(`${this.apiUrl}/aidant/${accompagnantId}`);
  }

  getScoreGlobalForAidant(aidantId: number): Observable<ScoreGlobal> {
    return this.http.get<ScoreGlobal>(`${this.apiUrl}/aidant/${aidantId}/score-global`);
  }

  getHistoriquePatient(patientId: number, mois: number = 6): Observable<HistoriquePoint[]> {
    return this.http.get<HistoriquePoint[]>(`${this.apiUrl}/patient/${patientId}/historique`, {
      params: { mois: mois.toString() }
    });
  }

  getCohorteSummary(soignantId: number): Observable<PatientScoreResume[]> {
    return this.http.get<PatientScoreResume[]>(`${this.apiUrl}/cohorte/medecin/${soignantId}`);
  }
}
