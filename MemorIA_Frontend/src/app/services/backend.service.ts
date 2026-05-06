import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Test, Question, TestSession, TestAnswer, GameData, TestType, MMSE_QUESTIONS, MOCK_QUESTIONS } from '../models/test-models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private readonly API_BASE_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Test Management
  getTestById(testId: string): Observable<Test> {
    return this.http.get<Test>(`${this.API_BASE_URL}/tests/${testId}`).pipe(
      catchError(error => {
        console.warn('Backend not available, using mock data');
        return this.getMockTest(testId);
      })
    );
  }

  // Question Loading Logic
  getQuestionsForTest(testId: string, testType: TestType): Observable<Question[]> {
    let params = new HttpParams().set('testType', testType);

    return this.http.get<Question[]>(`${this.API_BASE_URL}/tests/${testId}/questions`, { params }).pipe(
      map(questions => {
        // Apply test-specific logic
        switch (testType) {
          case TestType.MMSE:
            return questions; // All 30 MMSE questions
          case TestType.GAME:
            return questions; // Game configuration
          default:
            return this.selectRandomQuestions(questions, 10);
        }
      }),
      catchError(error => {
        console.warn('Backend not available, using mock questions');
        return this.getMockQuestions(testType);
      })
    );
  }

  // Game Configuration
  getGameConfiguration(gameType: string): Observable<GameData> {
    return this.http.get<GameData>(`${this.API_BASE_URL}/games/${gameType}/config`).pipe(
      catchError(error => {
        console.warn('Backend not available, using mock game data');
        return of(this.generateMockGameData());
      })
    );
  }

  // Session Management
  createTestSession(testId: string, patientId: string): Observable<TestSession> {
    const sessionData = {
      testId,
      patientId,
      startTime: new Date().toISOString()
    };

    return this.http.post<TestSession>(`${this.API_BASE_URL}/sessions`, sessionData).pipe(
      catchError(error => {
        console.warn('Backend not available, creating local session');
        return of(this.createLocalSession(testId, patientId));
      })
    );
  }

  saveAnswer(sessionId: string, answer: TestAnswer): Observable<TestAnswer> {
    return this.http.post<TestAnswer>(`${this.API_BASE_URL}/sessions/${sessionId}/answers`, answer).pipe(
      catchError(error => {
        console.warn('Backend not available, saving locally');
        return of(answer);
      })
    );
  }

  completeTestSession(sessionId: string): Observable<TestSession> {
    return this.http.put<TestSession>(`${this.API_BASE_URL}/sessions/${sessionId}/complete`, {}).pipe(
      catchError(error => {
        console.warn('Backend not available, completing locally');
        return of(this.createLocalCompletedSession(sessionId));
      })
    );
  }

  // Helper Methods
  private selectRandomQuestions(questions: Question[], count: number): Question[] {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, questions.length));
  }

  private getMockTest(testId: string): Observable<Test> {
    const mockTests: { [key: string]: Test } = {
      'mmse_test': {
        id: 'mmse_test',
        name: 'Test MMSE',
        type: TestType.MMSE,
        category: 'COGNITIVE' as any,
        description: 'Mini Mental State Examination',
        durationMinutes: 30,
        totalQuestions: 30,
        difficulty: 'MEDIUM' as any,
        isPersonalized: false
      },
      'memory_test': {
        id: 'memory_test',
        name: 'Test de Mémoire',
        type: TestType.MEMORY,
        category: 'MEMORY' as any,
        description: 'Évaluation des capacités de mémoire',
        durationMinutes: 20,
        totalQuestions: 10,
        difficulty: 'EASY' as any,
        isPersonalized: false
      },
      'game_test': {
        id: 'game_test',
        name: 'Jeu de Mémoire',
        type: TestType.GAME,
        category: 'GAME' as any,
        description: 'Jeu interactif de mémoire',
        durationMinutes: 15,
        totalQuestions: 1,
        difficulty: 'EASY' as any,
        isPersonalized: false
      }
    };

    return of(mockTests[testId] || mockTests['memory_test']);
  }

  private getMockQuestions(testType: TestType): Observable<Question[]> {
    // Use imported mock questions from test-models
    
    switch (testType) {
      case TestType.MMSE:
        return of(MMSE_QUESTIONS);
      case TestType.GAME:
        return of([{
          id: 'game_memory_cards',
          type: 'GAME' as any,
          text: 'Jeu de mémoire : Trouvez les paires identiques',
          category: 'MEMORY' as any,
          order: 1,
          options: [],
          correctAnswer: '',
          points: 10,
          timeLimit: 120
        }]);
      default:
        return of(this.selectRandomQuestions(MOCK_QUESTIONS, 10));
    }
  }



  private createLocalSession(testId: string, patientId: string): TestSession {
    return {
      id: `session_${Date.now()}`,
      testId,
      patientId,
      startTime: new Date(),
      endTime: undefined,
      status: 'IN_PROGRESS' as any,
      currentQuestionIndex: 0,
      answers: [],
      score: 0,
      progress: 0
    };
  }

  private createLocalCompletedSession(sessionId: string): TestSession {
    return {
      id: sessionId,
      testId: '',
      patientId: '',
      startTime: new Date(),
      endTime: new Date(),
      status: 'COMPLETED' as any,
      currentQuestionIndex: 0,
      answers: [],
      score: 0,
      progress: 100
    };
  }

  private generateMockGameData(): GameData {
    return {
      type: 'MEMORY_CARDS' as any,
      cards: [
        { id: '1', content: '🧠', isFlipped: false, isMatched: false, position: 1 },
        { id: '2', content: '🧠', isFlipped: false, isMatched: false, position: 2 },
        { id: '3', content: '🎯', isFlipped: false, isMatched: false, position: 3 },
        { id: '4', content: '🎯', isFlipped: false, isMatched: false, position: 4 },
        { id: '5', content: '⭐', isFlipped: false, isMatched: false, position: 5 },
        { id: '6', content: '⭐', isFlipped: false, isMatched: false, position: 6 },
        { id: '7', content: '🎨', isFlipped: false, isMatched: false, position: 7 },
        { id: '8', content: '🎨', isFlipped: false, isMatched: false, position: 8 }
      ],
      timer: 120,
      moves: 0,
      score: 0,
      matches: 0
    };
  }
}
