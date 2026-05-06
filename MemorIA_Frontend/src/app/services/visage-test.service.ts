import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VisageAnswerDto {
  questionId?: number;
  selectedImage: string;
  correctImage?: string;
  patientId: number;
  testId: number;
  responseTime?: number;
}

export interface VisageResultDto {
  resultId?: number;
  testId: number;
  patientId: number;
  score: number;
  totalQuestions: number;
  completedAt?: Date;
  answers?: VisageAnswerDto[];
  error?: string;
  totalTime?: number;
  getScorePercentage?: () => number;
  getAverageResponseTime?: () => number;
}

export interface VisageImage {
  id: string;
  url: string;
  name: string;
  isCorrect?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VisageTestService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  saveAnswer(answer: VisageAnswerDto): Observable<string> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<string>(`${this.apiUrl}/visage/save-answer`, answer, { headers });
  }

  submitTest(result: VisageResultDto): Observable<VisageResultDto> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<VisageResultDto>(`${this.apiUrl}/visage/submit-test`, result, { headers });
  }

  getTestAnswers(testId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/visage/test-answers/${testId}`);
  }

  getVisageImages(testId: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/visage/images/${testId}`);
  }

  // Utility method to extract image name from URL
  extractImageName(url: string): string {
    if (!url) return '';
    return url.split('/').pop() || url;
  }

  // Method to validate if selected image matches correct image
  validateImageSelection(selected: string, correct: string): boolean {
    if (!selected || !correct) return false;
    return selected.trim().toLowerCase() === correct.trim().toLowerCase();
  }
}
