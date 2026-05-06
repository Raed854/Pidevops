import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PatientDTO, AccompagnantDTO, AssignationRequest, PersonalizedTestRequest } from '../models/cognitive-models';

@Injectable({
    providedIn: 'root'
})
export class AssignationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/assignations`;
    private aidantApiUrl = `${environment.apiUrl}/aidant`;

    createAssignation(request: AssignationRequest): Observable<any> {
        return this.http.post(this.apiUrl, request);
    }

    createPersonalizedAssignation(request: PersonalizedTestRequest): Observable<any> {
        return this.http.post(`${this.apiUrl}/personalized`, request);
    }

    // Nouveaux endpoints pour la recherche de patients avec médecin
    getAllPatientsWithMedecin(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/patients/with-medecin`);
    }

    searchPatients(query?: string): Observable<any[]> {
        const params = query ? `?query=${encodeURIComponent(query)}` : '';
        return this.http.get<any[]>(`${this.apiUrl}/patients/search${params}`);
    }

    // Endpoint pour récupérer le médecin d'un patient
    getSoignantByPatient(patientId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/patient/${patientId}/soignant`);
    }

    // Anciens endpoints conservés pour compatibilité
    getPatientsByMedecin(soignantId: number): Observable<PatientDTO[]> {
        return this.http.get<PatientDTO[]>(`${this.apiUrl}/medecin/${soignantId}/patients`);
    }

    // Nouvelle méthode pour récupérer toutes les assignments
    getAllAssignations(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/all`);
    }

    getAidantsByPatient(patientId: number): Observable<AccompagnantDTO[]> {
        return this.http.get<AccompagnantDTO[]>(`${this.apiUrl}/medecin/patients/${patientId}/aidants`);
    }

    getAllAidants(): Observable<AccompagnantDTO[]> {
        return this.http.get<AccompagnantDTO[]>(`${this.aidantApiUrl}/all`);
    }

    getAssignationsByMedecin(soignantId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/medecin/${soignantId}`);
    }

    getAssignationsByAidant(accompagnantId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/aidant/${accompagnantId}/a-faire`);
    }

    getPlanningByAidant(accompagnantId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/aidant/${accompagnantId}/planning`);
    }

    getAssignationsByPatient(patientId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/patient/${patientId}/tests`);
    }

    getAidantPatientTests(aidantId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.aidantApiUrl}/patient-tests/${aidantId}`);
    }

    startTest(assignId: number, accompagnantId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/demarrer/${assignId}?accompagnantId=${accompagnantId}`, {});
    }

    finishTest(resultId: number, answers: any[], observations: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/terminer/${resultId}`, { answers, observations });
    }
}
