import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TestResult } from '../models/cognitive-models';

@Injectable({
    providedIn: 'root'
})
export class TestResultService {
    private apiUrl = `${environment.apiUrl}/test-results`;

    constructor(private http: HttpClient) { }

    getAll(): Observable<TestResult[]> {
        return this.http.get<TestResult[]>(this.apiUrl);
    }

    getByPatient(patientId: number): Observable<TestResult[]> {
        return this.http.get<TestResult[]>(`${this.apiUrl}/patient/${patientId}`);
    }

    create(result: TestResult): Observable<TestResult> {
        return this.http.post<TestResult>(this.apiUrl, result);
    }

    recalculate(id: number): Observable<TestResult> {
        return this.http.post<TestResult>(`${this.apiUrl}/${id}/recalculate`, {});
    }

    review(id: number, reviewerId: number): Observable<TestResult> {
        return this.http.patch<TestResult>(`${this.apiUrl}/${id}/review?reviewerId=${reviewerId}`, {});
    }
}
