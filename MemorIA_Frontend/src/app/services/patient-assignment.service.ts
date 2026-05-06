import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PatientTestAssignment, AssignmentStatus } from '../models/cognitive-models';

@Injectable({
    providedIn: 'root'
})
export class PatientAssignmentService {
    private apiUrl = `${environment.apiUrl}/assignments`;

    constructor(private http: HttpClient) { }

    getAll(): Observable<PatientTestAssignment[]> {
        return this.http.get<PatientTestAssignment[]>(this.apiUrl);
    }

    getByPatient(patientId: number): Observable<PatientTestAssignment[]> {
        return this.http.get<PatientTestAssignment[]>(`${this.apiUrl}/patient/${patientId}`);
    }

    assignTest(patientId: number, testId: number, assignedBy: number, dueDate?: string): Observable<PatientTestAssignment> {
        let params = new HttpParams().set('assignedBy', assignedBy.toString());
        if (dueDate) {
            params = params.set('dueDate', dueDate);
        }
        return this.http.post<PatientTestAssignment>(`${this.apiUrl}/patients/${patientId}/tests/${testId}`, {}, { params });
    }

    updateStatus(id: number, status: AssignmentStatus): Observable<PatientTestAssignment> {
        return this.http.patch<PatientTestAssignment>(`${this.apiUrl}/${id}/status?status=${status}`, {});
    }

    sendReminder(id: number): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${id}/send-reminder`, {});
    }
}
