import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Decision } from '../models/cognitive-models';

@Injectable({
    providedIn: 'root'
})
export class DecisionService {
    private apiUrl = `${environment.apiUrl}/decisions`;

    constructor(private http: HttpClient) { }

    getByPatient(patientId: number): Observable<Decision[]> {
        return this.http.get<Decision[]>(`${this.apiUrl}/patient/${patientId}`);
    }

    createAutoDecision(testResultId: number): Observable<Decision> {
        return this.http.post<Decision>(`${this.apiUrl}/from-result/${testResultId}`, {});
    }

    approve(id: number, approverId: number): Observable<Decision> {
        return this.http.patch<Decision>(`${this.apiUrl}/${id}/approve?approverId=${approverId}`, {});
    }
}
