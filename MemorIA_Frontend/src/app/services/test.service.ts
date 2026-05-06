import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { 
  Test, 
  TestSession, 
  Question, 
  TestAnswer, 
  TestType, 
  TestSessionStatus,
  QuestionType,
  GameData,
  GameCard,
  GameType,
  MMSE_QUESTIONS,
  MOCK_QUESTIONS 
} from '../models/test-models';

// Backend API Interfaces
export interface TestResponse {
  test: {
    id: number;
    name: string;
    type: 'MMSE' | 'STANDARD' | 'GAME' | 'CUSTOM';
    description?: string;
  };
  questions?: Question[];
  gameConfig?: GameConfig;
}

export interface GameConfig {
  type: 'GAME';
  gameType: 'IMAGE_PAIR' | 'MEMORY_CARDS' | 'SEQUENCE_MEMORY';
  cards: string[];
  config?: any;
}

@Injectable({
  providedIn: 'root'
})
export class TestService {
  private currentSession$ = new BehaviorSubject<TestSession | null>(null);
  private sessions: TestSession[] = [];
  private readonly apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {
    this.loadSessionsFromStorage();
  }

  // ========== BACKEND API METHODS ==========
  
  /**
   * Get test questions by test ID
   * Backend controls ALL logic - frontend just displays what it receives
   * 
   * Backend Business Logic:
   * 1️⃣ IF test = MMSE → Return ALL 30 official MMSE questions (ordered)
   * 2️⃣ IF test = STANDARD → Return ONLY 10 RANDOM questions  
   * 3️⃣ IF test = GAME → Return game configuration (no questions)
   * 4️⃣ IF test = CUSTOM → Return all questions with dynamic types
   */
  getTestQuestions(testId: string): Observable<TestResponse> {
    return this.http.get<TestResponse>(`${this.apiUrl}/tests/${testId}/questions`);
  }

  /**
   * Submit test answers to backend
   */
  submitTestAnswers(testId: string, answers: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/tests/${testId}/submit`, { answers });
  }

  /**
   * Get test results from backend
   */
  getTestResults(sessionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/results/${sessionId}`);
  }

  // ========== EXISTING METHODS ==========

  // Navigation and Test Management
  startTest(test: Test, patientId: string): Observable<TestSession> {
    const questions = this.getQuestionsForTest(test);
    const session: TestSession = {
      id: this.generateId(),
      testId: test.id,
      patientId: patientId,
      startTime: new Date(),
      currentQuestionIndex: 0,
      answers: [],
      status: TestSessionStatus.IN_PROGRESS,
      progress: 0
    };

    this.sessions.push(session);
    this.currentSession$.next(session);
    this.saveSessionsToStorage();

    return of(session).pipe(delay(500)); // Simulate API delay
  }

  getQuestionsForTest(test: Test): Question[] {
    switch (test.type) {
      case TestType.MMSE:
        return [...MMSE_QUESTIONS];
      case TestType.GAME:
        return this.generateGameQuestions(test);
      case TestType.PERSONALIZED:
        return this.getPersonalizedQuestions(test);
      default:
        return this.getRandomQuestions(10);
    }
  }

  private generateGameQuestions(test: Test): Question[] {
    return [
      {
        id: 'game_1',
        type: QuestionType.GAME_MATCHING,
        text: "Trouvez les paires d'images identiques",
        category: test.category,
        points: 10,
        order: 1
      }
    ];
  }

  private getPersonalizedQuestions(test: Test): Question[] {
    // In real implementation, fetch from backend based on test configuration
    return MOCK_QUESTIONS.slice(0, 8);
  }

  private getRandomQuestions(count: number): Question[] {
    const shuffled = [...MOCK_QUESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, MOCK_QUESTIONS.length));
  }

  // Session Management
  getCurrentSession(): Observable<TestSession | null> {
    return this.currentSession$.asObservable();
  }

  getCurrentQuestion(): Observable<Question | null> {
    return this.currentSession$.pipe(
      map(session => {
        if (!session) return null;
        const questions = this.getQuestionsForSession(session.testId);
        return questions[session.currentQuestionIndex] || null;
      })
    );
  }

  private getQuestionsForSession(testId: string): Question[] {
    // In real implementation, cache questions per session
    return MOCK_QUESTIONS;
  }

  answerQuestion(answer: TestAnswer): Observable<void> {
    const session = this.currentSession$.value;
    if (!session) return of(void 0);

    const existingAnswerIndex = session.answers.findIndex(a => a.questionId === answer.questionId);
    
    if (existingAnswerIndex >= 0) {
      session.answers[existingAnswerIndex] = answer;
    } else {
      session.answers.push(answer);
    }

    this.updateSessionProgress(session);
    this.saveSessionsToStorage();
    this.currentSession$.next(session);

    return of(void 0).pipe(delay(200));
  }

  nextQuestion(): Observable<void> {
    const session = this.currentSession$.value;
    if (!session) return of(void 0);

    const questions = this.getQuestionsForSession(session.testId);
    if (session.currentQuestionIndex < questions.length - 1) {
      session.currentQuestionIndex++;
      this.updateSessionProgress(session);
      this.currentSession$.next(session);
      this.saveSessionsToStorage();
    }

    return of(void 0).pipe(delay(200));
  }

  previousQuestion(): Observable<void> {
    const session = this.currentSession$.value;
    if (!session) return of(void 0);

    if (session.currentQuestionIndex > 0) {
      session.currentQuestionIndex--;
      this.updateSessionProgress(session);
      this.currentSession$.next(session);
      this.saveSessionsToStorage();
    }

    return of(void 0).pipe(delay(200));
  }

  private updateSessionProgress(session: TestSession): void {
    const questions = this.getQuestionsForSession(session.testId);
    session.progress = (session.currentQuestionIndex / questions.length) * 100;
  }

  completeTest(): Observable<TestSession> {
    const session = this.currentSession$.value;
    if (!session) return of(null as any);

    session.endTime = new Date();
    session.status = TestSessionStatus.COMPLETED;
    session.score = this.calculateScore(session);
    session.progress = 100;

    this.saveSessionsToStorage();
    this.currentSession$.next(session);

    return of(session).pipe(delay(500));
  }

  private calculateScore(session: TestSession): number {
    const questions = this.getQuestionsForSession(session.testId);
    let totalScore = 0;
    let maxScore = 0;

    questions.forEach(question => {
      maxScore += question.points;
      const answer = session.answers.find(a => a.questionId === question.id);
      if (answer && this.isAnswerCorrect(question, answer)) {
        totalScore += question.points;
      }
    });

    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  }

  private isAnswerCorrect(question: Question, answer: TestAnswer): boolean {
    switch (question.type) {
      case QuestionType.MULTIPLE_CHOICE:
        return answer.answer === question.correctAnswer;
      case QuestionType.YES_NO:
        const yesNoAnswer = String(answer.answer).toLowerCase();
        return yesNoAnswer === 'oui' || yesNoAnswer === 'non';
      case QuestionType.CALCULATION:
        return !isNaN(Number(answer.answer));
      case QuestionType.RECALL:
        if (question.id === 'mmse_16') {
          // Special case for MMSE word recall
          const words = String(answer.answer).toLowerCase().split(/[,\s]+/);
          const targetWords = ['ballon', 'voiture', 'fleur'];
          const foundWords = words.filter(word => targetWords.includes(word));
          return foundWords.length > 0;
        }
        return String(answer.answer).trim().length > 0;
      default:
        return String(answer.answer).trim().length > 0;
    }
  }

  // Game Management
  generateGameData(gameType: GameType): GameData {
    switch (gameType) {
      case GameType.MEMORY_CARDS:
        return this.generateMemoryCardsGame();
      case GameType.IMAGE_MATCHING:
        return this.generateImageMatchingGame();
      default:
        return this.generateMemoryCardsGame();
    }
  }

  private generateMemoryCardsGame(): GameData {
    const symbols = ['🍎', '🍌', '🍇', '🍓', '🍒', '🍑'];
    const cards: GameCard[] = [];
    
    symbols.forEach((symbol, index) => {
      cards.push(
        {
          id: `card_${index}_1`,
          content: symbol,
          isFlipped: false,
          isMatched: false,
          position: index * 2
        },
        {
          id: `card_${index}_2`,
          content: symbol,
          isFlipped: false,
          isMatched: false,
          position: index * 2 + 1
        }
      );
    });

    return {
      type: GameType.MEMORY_CARDS,
      cards: cards.sort(() => Math.random() - 0.5),
      timer: 120,
      score: 0,
      moves: 0,
      matches: 0
    };
  }

  private generateImageMatchingGame(): GameData {
    const images = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊'];
    const cards: GameCard[] = [];
    
    images.forEach((image, index) => {
      cards.push(
        {
          id: `img_${index}_1`,
          content: image,
          isFlipped: false,
          isMatched: false,
          position: index * 2
        },
        {
          id: `img_${index}_2`,
          content: image,
          isFlipped: false,
          isMatched: false,
          position: index * 2 + 1
        }
      );
    });

    return {
      type: GameType.IMAGE_MATCHING,
      cards: cards.sort(() => Math.random() - 0.5),
      timer: 90,
      score: 0,
      moves: 0,
      matches: 0
    };
  }

  // Storage Management
  private saveSessionsToStorage(): void {
    try {
      localStorage.setItem('testSessions', JSON.stringify(this.sessions));
    } catch (error) {
      console.error('Error saving sessions to storage:', error);
    }
  }

  private loadSessionsFromStorage(): void {
    try {
      const stored = localStorage.getItem('testSessions');
      if (stored) {
        this.sessions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading sessions from storage:', error);
      this.sessions = [];
    }
  }

  getPatientSessions(patientId: string): TestSession[] {
    return this.sessions.filter(session => session.patientId === patientId);
  }

  getSessionById(sessionId: string): TestSession | null {
    return this.sessions.find(session => session.id === sessionId) || null;
  }

  // Utility Methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  pauseSession(): void {
    const session = this.currentSession$.value;
    if (session) {
      session.status = TestSessionStatus.PAUSED;
      this.saveSessionsToStorage();
      this.currentSession$.next(session);
    }
  }

  resumeSession(): void {
    const session = this.currentSession$.value;
    if (session) {
      session.status = TestSessionStatus.IN_PROGRESS;
      this.saveSessionsToStorage();
      this.currentSession$.next(session);
    }
  }

  abandonSession(): void {
    const session = this.currentSession$.value;
    if (session) {
      session.status = TestSessionStatus.ABANDONED;
      session.endTime = new Date();
      this.saveSessionsToStorage();
      this.currentSession$.next(null);
    }
  }

  clearCurrentSession(): void {
    this.currentSession$.next(null);
  }
}
