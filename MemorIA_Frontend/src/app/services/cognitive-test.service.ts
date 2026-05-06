import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CognitiveTest } from '../models/cognitive-models';

@Injectable({
    providedIn: 'root'
})
export class CognitiveTestService {
    private apiUrl = `${environment.apiUrl}/cognitive-tests`;

    constructor(private http: HttpClient) { }

    getAll(filters?: { type?: string, difficulty?: string, isActive?: boolean, search?: string }): Observable<CognitiveTest[]> {
        let params = {};
        if (filters) {
            params = Object.entries(filters)
                .reduce((acc, [key, value]) => value !== undefined && value !== null ? { ...acc, [key]: value } : acc, {});
        }
        return this.http.get<CognitiveTest[]>(this.apiUrl, { params });
    }

    getById(id: number): Observable<CognitiveTest> {
        return this.http.get<CognitiveTest>(`${this.apiUrl}/${id}`);
    }

    create(test: CognitiveTest): Observable<CognitiveTest> {
        return this.http.post<CognitiveTest>(this.apiUrl, test);
    }

    update(id: number, test: CognitiveTest): Observable<CognitiveTest> {
        return this.http.put<CognitiveTest>(`${this.apiUrl}/${id}`, test);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    activate(id: number): Observable<void> {
        return this.http.patch<void>(`${this.apiUrl}/${id}/activate`, {});
    }

    duplicate(id: number): Observable<CognitiveTest> {
        return this.http.post<CognitiveTest>(`${this.apiUrl}/${id}/duplicate`, {});
    }

    getTypes(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/types`);
    }
}
