import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PatientTest {
  id: number;
  titre: string;
  type: string;
  description: string;
  dateLimite: string;
  durationMinutes: number;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  score?: number;
  dateCreation: string;
  patientId: number;
  medecinId: number;
  accompagnantId?: number;
}

export interface TestFilters {
  type?: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: 'date' | 'type' | 'status';
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class PatientTestService {
  private readonly apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer tous les tests d'un patient spécifique
   */
  getPatientTests(patientId: number): Observable<PatientTest[]> {
    return this.http.get<PatientTest[]>(`${this.apiUrl}/patients/${patientId}/tests`);
  }

  /**
   * Récupérer les tests d'un patient pour un aidant
   * L'aidant peut voir les mêmes tests que le patient
   */
  getPatientTestsForAidant(patientId: number, aidantId: number): Observable<PatientTest[]> {
    return this.http.get<PatientTest[]>(`${this.apiUrl}/patients/${patientId}/tests/aidant/${aidantId}`);
  }

  /**
   * Récupérer les tests avec filtres
   */
  getPatientTestsWithFilters(patientId: number, filters: TestFilters): Observable<PatientTest[]> {
    let url = `${this.apiUrl}/patients/${patientId}/tests?`;
    
    // Ajouter les filtres à l'URL
    if (filters.type) url += `type=${filters.type}&`;
    if (filters.status) url += `status=${filters.status}&`;
    if (filters.sortBy) url += `sortBy=${filters.sortBy}&`;
    if (filters.sortOrder) url += `sortOrder=${filters.sortOrder}&`;
    if (filters.dateRange) {
      url += `startDate=${filters.dateRange.start}&endDate=${filters.dateRange.end}&`;
    }
    
    return this.http.get<PatientTest[]>(url);
  }

  /**
   * Récupérer les détails d'un test spécifique
   */
  getTestDetails(testId: number): Observable<PatientTest> {
    return this.http.get<PatientTest>(`${this.apiUrl}/tests/${testId}`);
  }

  /**
   * Mettre à jour le statut d'un test
   */
  updateTestStatus(testId: number, status: string): Observable<PatientTest> {
    return this.http.patch<PatientTest>(`${this.apiUrl}/tests/${testId}/status`, { status });
  }

  /**
   * Récupérer les types de tests disponibles
   */
  getTestTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/tests/types`);
  }

  /**
   * Filtrer et trier les tests localement (optimisation)
   */
  filterAndSortTests(tests: PatientTest[], filters: TestFilters): PatientTest[] {
    let filteredTests = [...tests];

    // Filtrer par type
    if (filters.type) {
      filteredTests = filteredTests.filter(test => test.type === filters.type);
    }

    // Filtrer par statut
    if (filters.status) {
      filteredTests = filteredTests.filter(test => test.status === filters.status);
    }

    // Filtrer par plage de dates
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filteredTests = filteredTests.filter(test => {
        const testDate = new Date(test.dateCreation);
        return testDate >= startDate && testDate <= endDate;
      });
    }

    // Trier
    if (filters.sortBy) {
      filteredTests.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'date':
            comparison = new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime();
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
        }
        
        return filters.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return filteredTests;
  }

  /**
   * Obtenir des statistiques sur les tests du patient
   */
  getPatientTestStats(patientId: number): Observable<{
    total: number;
    completed: number;
    inProgress: number;
    assigned: number;
    averageScore?: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/patients/${patientId}/tests/stats`);
  }
}
