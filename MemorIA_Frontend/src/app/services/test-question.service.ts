import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TestQuestion, TestType } from '../models/cognitive-models';

@Injectable({
    providedIn: 'root'
})
export class TestQuestionService {
    private apiUrl = `${environment.apiUrl}`;

    constructor(private http: HttpClient) { }

    getByTestId(testId: number): Observable<TestQuestion[]> {
        return this.http.get<TestQuestion[]>(`${this.apiUrl}/cognitive-tests/${testId}/questions`);
    }

    getByType(type: string): Observable<TestQuestion[]> {
        return this.http.get<TestQuestion[]>(`${this.apiUrl}/test-questions/by-type/${type}`);
    }

    create(testId: number, question: TestQuestion): Observable<TestQuestion> {
        return this.http.post<TestQuestion>(`${this.apiUrl}/cognitive-tests/${testId}/questions`, question);
    }

    update(id: number, question: TestQuestion): Observable<TestQuestion> {
        return this.http.put<TestQuestion>(`${this.apiUrl}/questions/${id}`, question);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/questions/${id}`);
    }
}
