import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface TestWithQuestions {
  testId: number;
  testName: string;
  testType: string;
  difficultyLevel?: string;
  durationMinutes?: number;
  questions: QuestionWithAnswers[];
  is5MotsTest?: boolean;
  isVisagesTest?: boolean;
  isMotsCroisesTest?: boolean;
  redirectUrl?: string;
}

interface QuestionWithAnswers {
  id: number;
  questionText: string;
  questionType: string;
  imageUrl?: string;
  answers: AnswerOption[];
}

interface AnswerOption {
  id: number;
  answerText: string;
  imageUrl?: string;
  isCorrect: boolean;
  orderIndex?: number;
}

interface QuestionState {
  id: number;
  questionText: string;
  questionImageUrl?: string;
  answers: AnswerOption[];
  selectedAnswerId?: number;
  isValidated: boolean;
  isCorrect?: boolean;
}

interface TestResultRequest {
  patientId: number;
  testId: number;
  assignationId?: number;
  score: number;
  answers: {
    questionId: number;
    answerId: number;
    correct: boolean;
  }[];
}

@Component({
  selector: 'app-test-runner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="test-runner-container">
      @if (!isTestComplete()) {
        <!-- Header -->
        <div class="test-header">
          <div class="test-title-section">
            <h1 class="test-title">{{ testTitle() }}</h1>
            <span class="question-counter">Question {{ currentQuestionIndex() + 1 }} sur {{ totalQuestions() }}</span>
          </div>
          <div class="timer-box">
            <svg class="timer-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
              <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="timer-text">{{ formattedTime() }}</span>
          </div>
        </div>

        <!-- Progress -->
        <div class="progress-section">
          <span class="progress-text">{{ progressPercentage() }}% complété</span>
          <div class="progress-bar-container">
            <div class="progress-bar" [style.width.%]="progressPercentage()"></div>
          </div>
        </div>

        <!-- Game Mode Display -->
        @if (isGameMode()) {
          <div class="game-mode-container">
            <div class="game-mode-card">
              <h2 class="game-mode-title">{{ testTitle() }}</h2>
              <p class="game-mode-subtitle">Mode Jeu</p>
              <button class="btn-primary" (click)="startGame()">Commencer le Jeu</button>
            </div>
          </div>
        } @else {
          <!-- Question Display -->
          @if (currentQuestion(); as q) {
            <div class="question-section">
              <!-- Question Image -->
              @if (q.questionImageUrl) {
                <div class="question-image-container">
                  <img [src]="q.questionImageUrl" alt="Question image" class="question-image">
                </div>
              }
              <h2 class="question-text">{{ q.questionText }}</h2>
              
              <!-- Answers Container - Text or Image based -->
              <div class="answers-container" [class.image-answers]="hasImageAnswers()">
                @for (answer of q.answers; track answer.id; let idx = $index) {
                  @if (answer.imageUrl) {
                    <!-- Image Answer Card -->
                    <div 
                      class="image-answer-card"
                      [class.selected]="q.selectedAnswerId === answer.id"
                      [class.correct]="q.isValidated && answer.isCorrect"
                      [class.incorrect]="q.isValidated && q.selectedAnswerId === answer.id && !answer.isCorrect"
                      [class.disabled]="q.isValidated"
                      (click)="selectAnswer(answer.id)">
                      <div class="answer-image-wrapper">
                        <img [src]="answer.imageUrl" [alt]="answer.answerText" class="answer-image">
                      </div>
                      <span class="answer-label">{{ answer.answerText }}</span>
                      @if (q.isValidated && answer.isCorrect) {
                        <div class="validation-icon correct-icon">✓</div>
                      }
                      @if (q.isValidated && q.selectedAnswerId === answer.id && !answer.isCorrect) {
                        <div class="validation-icon incorrect-icon">✗</div>
                      }
                    </div>
                  } @else {
                    <!-- Text Answer Card -->
                    <div 
                      class="text-answer-card"
                      [class.selected]="q.selectedAnswerId === answer.id"
                      [class.correct]="q.isValidated && answer.isCorrect"
                      [class.incorrect]="q.isValidated && q.selectedAnswerId === answer.id && !answer.isCorrect"
                      [class.disabled]="q.isValidated"
                      (click)="selectAnswer(answer.id)">
                      <div class="answer-letter">{{ getLetter(idx) }}</div>
                      <span class="answer-text">{{ answer.answerText }}</span>
                      @if (q.isValidated && answer.isCorrect) {
                        <div class="validation-icon correct-icon">✓</div>
                      }
                      @if (q.isValidated && q.selectedAnswerId === answer.id && !answer.isCorrect) {
                        <div class="validation-icon incorrect-icon">✗</div>
                      }
                    </div>
                  }
                }
              </div>

              <!-- Validation Feedback -->
              @if (q.isValidated) {
                <div class="validation-feedback" [class.correct]="q.isCorrect" [class.incorrect]="!q.isCorrect">
                  @if (q.isCorrect) {
                    <span>✓ Bonne réponse !</span>
                  } @else {
                    <span>✗ Réponse incorrecte</span>
                  }
                </div>
              }
            </div>

            <!-- Navigation -->
            <div class="navigation-section">
              <button 
                class="btn-previous"
                [disabled]="currentQuestionIndex() === 0"
                (click)="goToPrevious()">
                Précédent
              </button>
              @if (!q.isValidated && q.selectedAnswerId !== undefined) {
                <button class="btn-validate" (click)="validateAnswer()">
                  Valider
                </button>
              } @else if (q.isValidated) {
                <button 
                  class="btn-next"
                  (click)="goToNext()">
                  {{ isLastQuestion() ? 'Terminer' : 'Suivant' }}
                </button>
              } @else {
                <button class="btn-next" disabled>
                  Valider
                </button>
              }
            </div>
          }
        }
      } @else {
        <!-- Results Display -->
        <div class="results-container">
          <div class="results-card">
            <h2 class="results-title">Test Terminé !</h2>
            <div class="score-display">
              <div class="score-circle" [class.high]="finalScore() >= 70" [class.medium]="finalScore() >= 40 && finalScore() < 70" [class.low]="finalScore() < 40">
                <span class="score-value">{{ finalScore() }}%</span>
              </div>
            </div>
            <div class="results-details">
              <p class="correct-answers">{{ correctAnswersCount() }} / {{ totalQuestions() }} réponses correctes</p>
              <p class="completion-status">{{ completionStatus() }}</p>
            </div>
            <div class="results-actions">
              <button class="btn-primary" (click)="returnToDashboard()">Retour aux tests</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .test-runner-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    /* Header */
    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e7eb;
    }

    .test-title-section { flex: 1; }

    .test-title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 4px 0;
      line-height: 1.3;
    }

    .question-counter {
      font-size: 14px;
      color: #6b7280;
      font-weight: 400;
    }

    .timer-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: 1.5px solid #d1d5db;
      border-radius: 10px;
      background: #ffffff;
    }

    .timer-icon {
      width: 20px;
      height: 20px;
      color: #374151;
    }

    .timer-text {
      font-size: 15px;
      font-weight: 600;
      color: #111827;
      font-variant-numeric: tabular-nums;
    }

    /* Progress */
    .progress-section {
      margin-bottom: 32px;
    }

    .progress-text {
      font-size: 13px;
      color: #6b7280;
      font-weight: 500;
      display: block;
      margin-bottom: 8px;
    }

    .progress-bar-container {
      width: 100%;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: #a78bfa;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    /* Game Mode */
    .game-mode-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .game-mode-card {
      text-align: center;
      padding: 48px 32px;
    }

    .game-mode-title {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px 0;
    }

    .game-mode-subtitle {
      font-size: 16px;
      color: #6b7280;
      margin: 0 0 32px 0;
    }

    /* Question Section */
    .question-section {
      margin-bottom: 32px;
    }

    .question-image-container {
      margin-bottom: 20px;
      text-align: center;
    }

    .question-image {
      max-width: 100%;
      max-height: 200px;
      border-radius: 12px;
      object-fit: contain;
    }

    .question-text {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 24px 0;
      line-height: 1.4;
    }

    /* Answers Container */
    .answers-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .answers-container.image-answers {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    @media (max-width: 640px) {
      .answers-container.image-answers {
        grid-template-columns: 1fr;
      }
    }

    /* Text Answer Card */
    .text-answer-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      background: #ffffff;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .text-answer-card:hover:not(.disabled) {
      border-color: #a78bfa;
      background: #faf5ff;
    }

    .text-answer-card.selected {
      border-color: #a78bfa;
      background: #f3f0ff;
    }

    .text-answer-card.correct {
      border-color: #22c55e !important;
      background: #f0fdf4 !important;
    }

    .text-answer-card.incorrect {
      border-color: #ef4444 !important;
      background: #fef2f2 !important;
    }

    .text-answer-card.disabled {
      cursor: not-allowed;
      opacity: 0.9;
    }

    .answer-letter {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      border-radius: 50%;
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      flex-shrink: 0;
    }

    .text-answer-card.selected .answer-letter {
      background: #a78bfa;
      color: #ffffff;
    }

    .text-answer-card.correct .answer-letter {
      background: #22c55e;
      color: #ffffff;
    }

    .text-answer-card.incorrect .answer-letter {
      background: #ef4444;
      color: #ffffff;
    }

    .answer-text {
      font-size: 15px;
      color: #374151;
      font-weight: 500;
      flex: 1;
    }

    /* Image Answer Card */
    .image-answer-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      border: 2px solid #e5e7eb;
      border-radius: 16px;
      background: #ffffff;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .image-answer-card:hover:not(.disabled) {
      border-color: #a78bfa;
      background: #faf5ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(167, 139, 250, 0.15);
    }

    .image-answer-card.selected {
      border-color: #a78bfa;
      background: #f3f0ff;
    }

    .image-answer-card.correct {
      border-color: #22c55e !important;
      background: #f0fdf4 !important;
    }

    .image-answer-card.incorrect {
      border-color: #ef4444 !important;
      background: #fef2f2 !important;
    }

    .image-answer-card.disabled {
      cursor: not-allowed;
      opacity: 0.9;
    }

    .answer-image-wrapper {
      width: 80px;
      height: 80px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .answer-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .answer-label {
      font-size: 14px;
      color: #374151;
      font-weight: 500;
      text-align: center;
    }

    /* Validation Icons */
    .validation-icon {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
    }

    .correct-icon {
      background: #22c55e;
    }

    .incorrect-icon {
      background: #ef4444;
    }

    /* Validation Feedback */
    .validation-feedback {
      margin-top: 20px;
      padding: 12px 20px;
      border-radius: 10px;
      text-align: center;
      font-weight: 600;
      font-size: 16px;
    }

    .validation-feedback.correct {
      background: #f0fdf4;
      color: #16a34a;
    }

    .validation-feedback.incorrect {
      background: #fef2f2;
      color: #dc2626;
    }

    /* Navigation */
    .navigation-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }

    .btn-previous {
      padding: 12px 24px;
      border: 1.5px solid #d1d5db;
      border-radius: 10px;
      background: #ffffff;
      color: #6b7280;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-previous:hover:not(:disabled) {
      border-color: #9ca3af;
      color: #374151;
    }

    .btn-previous:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-next, .btn-validate {
      padding: 12px 32px;
      border: none;
      border-radius: 10px;
      background: #a78bfa;
      color: #ffffff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-next:hover:not(:disabled), .btn-validate:hover {
      background: #8b5cf6;
    }

    .btn-next:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #d1d5db;
    }

    .btn-primary {
      padding: 14px 32px;
      border: none;
      border-radius: 10px;
      background: #a78bfa;
      color: #ffffff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary:hover {
      background: #8b5cf6;
    }

    /* Results Container */
    .results-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .results-card {
      text-align: center;
      padding: 48px 32px;
      max-width: 400px;
      width: 100%;
    }

    .results-title {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 32px 0;
    }

    .score-display {
      margin-bottom: 32px;
    }

    .score-circle {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      border: 8px solid #e5e7eb;
    }

    .score-circle.high {
      border-color: #22c55e;
      background: #f0fdf4;
    }

    .score-circle.medium {
      border-color: #f59e0b;
      background: #fffbeb;
    }

    .score-circle.low {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .score-value {
      font-size: 36px;
      font-weight: 700;
      color: #111827;
    }

    .results-details {
      margin-bottom: 32px;
    }

    .correct-answers {
      font-size: 18px;
      color: #374151;
      margin: 0 0 8px 0;
    }

    .completion-status {
      font-size: 16px;
      color: #6b7280;
      margin: 0;
    }

    .results-actions {
      display: flex;
      justify-content: center;
    }
  `]
})
export class TestRunnerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  private apiUrl = environment.apiUrl;

  // Signals
  testId = signal<number>(0);
  testTitle = signal<string>('');
  testType = signal<string>('');
  questions = signal<QuestionState[]>([]);
  currentQuestionIndex = signal<number>(0);
  elapsedSeconds = signal<number>(0);
  isGameMode = signal<boolean>(false);
  isTestComplete = signal<boolean>(false);
  correctAnswersCount = signal<number>(0);
  finalScore = signal<number>(0);

  // Computed
  totalQuestions = computed(() => this.questions().length);
  currentQuestion = computed(() => this.questions()[this.currentQuestionIndex()] || null);
  progressPercentage = computed(() => {
    if (this.totalQuestions() === 0) return 0;
    return Math.round((this.currentQuestionIndex() / this.totalQuestions()) * 100);
  });
  isLastQuestion = computed(() => this.currentQuestionIndex() === this.totalQuestions() - 1);
  formattedTime = computed(() => {
    const minutes = Math.floor(this.elapsedSeconds() / 60);
    const seconds = this.elapsedSeconds() % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });
  completionStatus = computed(() => {
    const score = this.finalScore();
    if (score >= 80) return 'Excellent ! 🎉';
    if (score >= 60) return 'Très bien ! 👍';
    if (score >= 40) return 'Continuez vos efforts 💪';
    return 'Besoin de pratique 📚';
  });

  private timerInterval: any;
  private patientId: number = 1;
  private assignationId?: number;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('testId');
    if (id) {
      this.testId.set(parseInt(id, 10));
      this.loadTestData();
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private loadTestData(): void {
    const testId = this.testId();

    this.http.get<TestWithQuestions>(`${this.apiUrl}/tests/${testId}`).subscribe({
      next: (test) => {
        this.testTitle.set(test.testName || 'Test Cognitif');
        this.testType.set(test.testType || '');

        // Check if this is a 5 mots test and redirect
        if (test.is5MotsTest && test.redirectUrl) {
          console.log('5 mots test detected, redirecting to:', test.redirectUrl);
          window.location.href = test.redirectUrl;
          return;
        }

        // Check if this is a visages test and redirect
        if (test.isVisagesTest && test.redirectUrl) {
          console.log('Visages test detected, redirecting to:', test.redirectUrl);
          window.location.href = test.redirectUrl;
          return;
        }

        // Check if this is a mots croises test and redirect
        if (test.isMotsCroisesTest && test.redirectUrl) {
          console.log('Mots croises test detected, redirecting to:', test.redirectUrl);
          window.location.href = test.redirectUrl;
          return;
        }

        if (test.testType === 'GAME' || (test.testName && test.testName.toUpperCase().includes('JEU'))) {
          this.isGameMode.set(true);
          return;
        }

        this.processQuestionsFromDto(test.questions || [], test.testName || '');
      },
      error: (err) => {
        console.error('Error loading test:', err);
        this.testTitle.set('Test d\'Orientation');
        this.useMockQuestions('');
      }
    });
  }

  private processQuestionsFromDto(questions: QuestionWithAnswers[], testName: string): void {
    if (!questions || questions.length === 0) {
      this.useMockQuestions(testName);
      return;
    }

    const isMMSE = testName.toUpperCase().includes('MMSE');
    let processedQuestions = [...questions];
    if (!isMMSE && questions.length > 10) {
      processedQuestions = this.selectRandomQuestions(questions, 10);
    }

    const questionStates: QuestionState[] = processedQuestions.map(q => {
      // Generate answers if backend returned empty array
      let answers = q.answers || [];
      if (answers.length === 0) {
        answers = this.generateAnswersForQuestion(q.questionText);
      }

      return {
        id: q.id,
        questionText: q.questionText,
        questionImageUrl: q.imageUrl,
        answers: answers,
        selectedAnswerId: undefined,
        isValidated: false,
        isCorrect: undefined
      };
    });

    this.questions.set(questionStates);
    this.startTimer();
  }

  private generateAnswersForQuestion(questionText: string): AnswerOption[] {
    const text = questionText.toLowerCase();
    const now = new Date();

    if (text.includes('date') || text.includes('jour')) {
      const today = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      return [
        { id: 1, answerText: today, isCorrect: true },
        { id: 2, answerText: yesterday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }), isCorrect: false },
        { id: 3, answerText: tomorrow.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }), isCorrect: false },
        { id: 4, answerText: twoDaysAgo.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }), isCorrect: false }
      ];
    } else if (text.includes('mois')) {
      const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const currentMonth = months[now.getMonth()];
      const otherMonths = months.filter(m => m !== currentMonth);
      return [
        { id: 1, answerText: currentMonth, isCorrect: true },
        { id: 2, answerText: otherMonths[0], isCorrect: false },
        { id: 3, answerText: otherMonths[4], isCorrect: false },
        { id: 4, answerText: otherMonths[8], isCorrect: false }
      ];
    } else if (text.includes('année') || text.includes('annee')) {
      const year = now.getFullYear();
      return [
        { id: 1, answerText: String(year), isCorrect: true },
        { id: 2, answerText: String(year - 1), isCorrect: false },
        { id: 3, answerText: String(year + 1), isCorrect: false },
        { id: 4, answerText: String(year - 2), isCorrect: false }
      ];
    } else if (text.includes('pays')) {
      return [
        { id: 1, answerText: 'France', isCorrect: true },
        { id: 2, answerText: 'Belgique', isCorrect: false },
        { id: 3, answerText: 'Suisse', isCorrect: false },
        { id: 4, answerText: 'Italie', isCorrect: false }
      ];
    } else if (text.includes('ville')) {
      return [
        { id: 1, answerText: 'Paris', isCorrect: true },
        { id: 2, answerText: 'Lyon', isCorrect: false },
        { id: 3, answerText: 'Marseille', isCorrect: false },
        { id: 4, answerText: 'Bordeaux', isCorrect: false }
      ];
    } else if (text.includes('étage') || text.includes('etage')) {
      return [
        { id: 1, answerText: 'Rez-de-chaussée', isCorrect: true },
        { id: 2, answerText: '1er étage', isCorrect: false },
        { id: 3, answerText: '2ème étage', isCorrect: false },
        { id: 4, answerText: '3ème étage', isCorrect: false }
      ];
    } else if (text.includes('lieu') || text.includes('endroit')) {
      return [
        { id: 1, answerText: 'À l\'hôpital', isCorrect: true },
        { id: 2, answerText: 'Au cabinet médical', isCorrect: false },
        { id: 3, answerText: 'À domicile', isCorrect: false },
        { id: 4, answerText: 'À la clinique', isCorrect: false }
      ];
    } else if (text.includes('heure')) {
      const hour = now.getHours();
      return [
        { id: 1, answerText: `${hour}h`, isCorrect: true },
        { id: 2, answerText: `${hour - 2}h`, isCorrect: false },
        { id: 3, answerText: `${hour + 2}h`, isCorrect: false },
        { id: 4, answerText: `${hour - 4}h`, isCorrect: false }
      ];
    } else if (text.includes('âge') || text.includes('age')) {
      return [
        { id: 1, answerText: '75 ans', isCorrect: true },
        { id: 2, answerText: '70 ans', isCorrect: false },
        { id: 3, answerText: '80 ans', isCorrect: false },
        { id: 4, answerText: '72 ans', isCorrect: false }
      ];
    } else if (text.includes('saison')) {
      const month = now.getMonth() + 1;
      let season = 'Hiver';
      if (month >= 3 && month <= 5) season = 'Printemps';
      else if (month >= 6 && month <= 8) season = 'Été';
      else if (month >= 9 && month <= 11) season = 'Automne';

      return [
        { id: 1, answerText: season, isCorrect: true },
        { id: 2, answerText: 'Printemps', isCorrect: season === 'Printemps' },
        { id: 3, answerText: 'Été', isCorrect: season === 'Été' },
        { id: 4, answerText: 'Automne', isCorrect: season === 'Automne' }
      ];
    } else {
      // Generic fallback
      return [
        { id: 1, answerText: 'Oui', isCorrect: true },
        { id: 2, answerText: 'Non', isCorrect: false },
        { id: 3, answerText: 'Peut-être', isCorrect: false },
        { id: 4, answerText: 'Je ne sais pas', isCorrect: false }
      ];
    }
  }

  private selectRandomQuestions(questions: QuestionWithAnswers[], count: number): QuestionWithAnswers[] {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private useMockQuestions(testName: string): void {
    const isMMSE = testName.toUpperCase().includes('MMSE');

    const mockQuestions: QuestionState[] = isMMSE ? [
      {
        id: 1, questionText: 'Dans quel pays sommes-nous ?', answers: [
          { id: 1, answerText: 'France', isCorrect: true },
          { id: 2, answerText: 'Belgique', isCorrect: false },
          { id: 3, answerText: 'Suisse', isCorrect: false },
          { id: 4, answerText: 'Canada', isCorrect: false }
        ], selectedAnswerId: undefined, isValidated: false
      },
      {
        id: 2, questionText: 'Quelle est la capitale de la France ?', answers: [
          { id: 5, answerText: 'Paris', isCorrect: true },
          { id: 6, answerText: 'Lyon', isCorrect: false },
          { id: 7, answerText: 'Marseille', isCorrect: false },
          { id: 8, answerText: 'Bordeaux', isCorrect: false }
        ], selectedAnswerId: undefined, isValidated: false
      }
    ] : [
      {
        id: 1, questionText: 'Dans quel pays sommes-nous ?', answers: [
          { id: 1, answerText: 'France', isCorrect: true },
          { id: 2, answerText: 'Belgique', isCorrect: false },
          { id: 3, answerText: 'Suisse', isCorrect: false },
          { id: 4, answerText: 'Canada', isCorrect: false }
        ], selectedAnswerId: undefined, isValidated: false
      }
    ];

    if (isMMSE && mockQuestions.length < 30) {
      for (let i = mockQuestions.length + 1; i <= 30; i++) {
        mockQuestions.push({
          id: i,
          questionText: `Question MMSE ${i}`,
          answers: [
            { id: i * 4 + 1, answerText: 'Option A', isCorrect: true },
            { id: i * 4 + 2, answerText: 'Option B', isCorrect: false },
            { id: i * 4 + 3, answerText: 'Option C', isCorrect: false },
            { id: i * 4 + 4, answerText: 'Option D', isCorrect: false }
          ],
          selectedAnswerId: undefined,
          isValidated: false
        });
      }
    }

    this.questions.set(mockQuestions);
    this.startTimer();
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds.update(s => s + 1);
    }, 1000);
  }

  hasImageAnswers(): boolean {
    const current = this.currentQuestion();
    if (!current) return false;
    return current.answers.some(a => a.imageUrl);
  }

  getLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  selectAnswer(answerId: number): void {
    const current = this.currentQuestion();
    if (!current || current.isValidated) return;

    const currentIdx = this.currentQuestionIndex();
    this.questions.update(qs => {
      const updated = [...qs];
      updated[currentIdx] = { ...updated[currentIdx], selectedAnswerId: answerId };
      return updated;
    });
  }

  validateAnswer(): void {
    const current = this.currentQuestion();
    if (!current || current.selectedAnswerId === undefined) return;

    const selectedAnswer = current.answers.find(a => a.id === current.selectedAnswerId);
    const isCorrect = selectedAnswer?.isCorrect || false;

    const currentIdx = this.currentQuestionIndex();
    this.questions.update(qs => {
      const updated = [...qs];
      updated[currentIdx] = {
        ...updated[currentIdx],
        isValidated: true,
        isCorrect: isCorrect
      };
      return updated;
    });
  }

  goToPrevious(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update(i => i - 1);
    }
  }

  goToNext(): void {
    if (this.isLastQuestion()) {
      this.finishTest();
    } else {
      this.currentQuestionIndex.update(i => i + 1);
    }
  }

  private finishTest(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    let correctCount = 0;
    const answers: { questionId: number; answerId: number; correct: boolean }[] = [];

    this.questions().forEach(q => {
      const isCorrect = q.isCorrect || false;
      if (isCorrect) correctCount++;

      if (q.selectedAnswerId !== undefined) {
        answers.push({
          questionId: q.id,
          answerId: q.selectedAnswerId,
          correct: isCorrect
        });
      }
    });

    const score = Math.round((correctCount / this.totalQuestions()) * 100);
    this.correctAnswersCount.set(correctCount);
    this.finalScore.set(score);
    this.isTestComplete.set(true);

    const resultRequest: TestResultRequest = {
      patientId: this.patientId,
      testId: this.testId(),
      assignationId: this.assignationId,
      score: score,
      answers: answers
    };

    this.http.post(`${this.apiUrl}/tests/${this.testId()}/results`, resultRequest).subscribe({
      next: (response) => {
        console.log('Test result saved:', response);
      },
      error: (err) => {
        console.error('Error saving test result:', err);
      }
    });
  }

  startGame(): void {
    alert('Interface de jeu en cours de développement');
    this.router.navigate(['/tests-cognitifs']);
  }

  returnToDashboard(): void {
    this.router.navigate(['/tests-cognitifs']);
  }
}
