import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MMSEScoreResponse {
  patientId: string;
  mmseScore: number;
  hasPassedTest: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class MmseScoreService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Récupère le dernier score MMSE d’un patient (0 si aucun test passé)
   */
  getLatestMMSEScore(patientId: string): Observable<MMSEScoreResponse> {
    return this.http.get<MMSEScoreResponse>(`${this.apiUrl}/metrics/patients/${patientId}/mmse-score`);
  }
}
