import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CrosswordAnswerDto {
  questionId?: number;
  answer: string;
  patientId: number;
  testId: number;
  row?: number;
  col?: number;
  direction?: string;
}

export interface CrosswordResultDto {
  resultId?: number;
  testId: number;
  patientId: number;
  score: number;
  totalQuestions: number;
  completedAt?: Date;
  answers?: CrosswordAnswerDto[];
  error?: string;
  getScorePercentage?: () => number;
}

@Injectable({
  providedIn: 'root'
})
export class CrosswordTestService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  saveAnswer(answer: CrosswordAnswerDto): Observable<string> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<string>(`${this.apiUrl}/crossword/save-answer`, answer, { headers });
  }

  submitTest(result: CrosswordResultDto): Observable<CrosswordResultDto> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<CrosswordResultDto>(`${this.apiUrl}/crossword/submit-test`, result, { headers });
  }

  getTestAnswers(testId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/crossword/test-answers/${testId}`);
  }

  getDefinitions(testId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/crossword/definitions/${testId}`);
  }
}
