import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

interface Reponse {
  idReponse: number;
  reponseText: string;
  reponse: boolean;
}

interface Question {
  id: number;
  text: string;
  type: string;
  reponses: Reponse[];
  selectedAnswer: string;
  correctAnswer: string;
  timeSpent: number; // seconds spent on this question
}

@Component({
  selector: 'app-diagnostic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diagnostic.component.html',
  styleUrl: './diagnostic.component.css'
})
export class DiagnosticComponent implements OnInit, OnDestroy {
  currentQuestionIndex = 0;
  showModal = false;
  score = 0;
  mriImage: string | null = null;
  mriImageFile: File | null = null;
  loading = true;
  errorMessage = '';

  questions: Question[] = [];

  // Time tracking
  private questionStartTime = 0;

  // Speech
  isSpeaking = false;
  isListening = false;
  liveTranscript = '';
  speechError = '';
  private recognition: any = null;
  private accumulatedTranscript = '';

  // Translation
  selectedLanguage = 'ar';
  isTranslating = false;
  translatedText = '';

  // Submit
  isSubmitting = false;
  submitMessage = '';

  // Date parts for DATE_CHECK questions
  dateParts: { [questionId: number]: { day: string; month: string; year: string } } = {};

  // ── Maze ──────────────────────────────────────────────
  showMaze = false;
  mazeCompleted = false;
  playerRow = 1;
  playerCol = 1;

  readonly maze: number[][] = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,1,0,1],
    [1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1]
  ];
  readonly mazeEndRow = 5;
  readonly mazeEndCol = 5;

  private keydownHandler = (e: KeyboardEvent): void => {
    if (!this.showMaze || this.mazeCompleted) return;
    const map: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0],
      ArrowLeft: [0, -1], ArrowRight: [0, 1]
    };
    if (e.key in map) {
      e.preventDefault();
      this.movePlayer(...map[e.key]);
    }
  };
  // ──────────────────────────────────────────────────────

  constructor(private http: HttpClient, private authService: AuthService, private router: Router, private ngZone: NgZone) {}

  onLogout(): void {
    this.authService.logout();
    window.location.href = '/home';
  }

  ngOnDestroy(): void {
    this.stopSpeaking();
    this.stopListening();
    window.removeEventListener('keydown', this.keydownHandler);
  }

  ngOnInit(): void {
    this.loadQuestions();
    window.addEventListener('keydown', this.keydownHandler);
  }

  loadQuestions(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<any[]>('http://localhost:9090/api/questions/random').subscribe({
      next: (data) => {
        this.questions = data.map(q => ({
          id: q.id,
          text: q.questionText,
          type: q.type || 'TEXT',
          reponses: q.reponses || [],
          selectedAnswer: '',
          correctAnswer: (q.reponses || []).find((r: any) => r.reponse === true)?.reponseText || '',
          timeSpent: 0
        }));
        this.loading = false;
        this.questionStartTime = Date.now();
      },
      error: () => {
        this.errorMessage = 'Unable to load questions. Make sure the server is running.';
        this.loading = false;
      }
    });
  }

  get currentQuestion(): Question {
    return this.questions[this.currentQuestionIndex];
  }

  get progressPercentage(): number {
    if (this.questions.length === 0) return 0;
    return Math.round((this.currentQuestionIndex / this.questions.length) * 100);
  }

  get totalQuestions(): number {
    return this.questions.length;
  }

  get currentQuestionNumber(): number {
    return this.currentQuestionIndex + 1;
  }

  private saveCurrentQuestionTime(): void {
    if (this.currentQuestion && this.questionStartTime > 0) {
      const elapsed = (Date.now() - this.questionStartTime) / 1000;
      this.currentQuestion.timeSpent += elapsed;
    }
    this.questionStartTime = Date.now();
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.stopListening();
      this.saveCurrentQuestionTime();
      this.translatedText = '';
      this.currentQuestionIndex--;
    }
  }

  nextQuestion(): void {
    this.stopListening();
    this.saveCurrentQuestionTime();
    this.translatedText = '';
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
    } else {
      this.finishTest();
    }
  }

  finishTest(): void {
    // Show maze bonus step before the results modal
    this.playerRow = 1;
    this.playerCol = 1;
    this.mazeCompleted = false;
    this.showMaze = true;
  }

  movePlayer(dRow: number, dCol: number): void {
    if (!this.showMaze || this.mazeCompleted) return;
    const nr = this.playerRow + dRow;
    const nc = this.playerCol + dCol;
    if (
      nr >= 0 && nr < this.maze.length &&
      nc >= 0 && nc < this.maze[0].length &&
      this.maze[nr][nc] !== 1
    ) {
      this.playerRow = nr;
      this.playerCol = nc;
      if (nr === this.mazeEndRow && nc === this.mazeEndCol) {
        this.mazeCompleted = true;
      }
    }
  }

  finishMaze(): void {
    this.showMaze = false;
    this.calculateScore();
    this.showModal = true;
  }

  skipMaze(): void {
    this.showMaze = false;
    this.calculateScore();
    this.showModal = true;
  }

  calculateScore(): void {
    if (this.questions.length === 0) {
      this.score = 0;
      return;
    }
    let correctAnswers = 0;
    let scorableQuestions = 0;

    this.questions.forEach(question => {
      const rawAnswer = String(question.selectedAnswer ?? '');
      if (!rawAnswer.trim()) {
        // No answer given - count as scorable but wrong
        scorableQuestions++;
        return;
      }

      const answer = rawAnswer.trim().toLowerCase();

      // Questions with predefined answers
      if (question.reponses.length > 0 && question.correctAnswer) {
        scorableQuestions++;
        const normalizedAnswer = this.normalizeText(answer);
        const normalizedCorrect = this.normalizeText(question.correctAnswer);
        if (
          normalizedAnswer === normalizedCorrect ||
          (normalizedCorrect.length >= 3 && normalizedAnswer.includes(normalizedCorrect)) ||
          (normalizedAnswer.length >= 3 && normalizedCorrect.includes(normalizedAnswer))
        ) {
          correctAnswers++;
        }
        return;
      }

      // Temporal questions - verify against current date/time
      const now = new Date();
      switch (question.type) {
        case 'DATE_CHECK': {
          scorableQuestions++;
          // Parse DD/MM/YYYY from the free-text input
          const parts = answer.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            if (
              day === now.getDate() &&
              month === now.getMonth() + 1 &&
              year === now.getFullYear()
            ) {
              correctAnswers++;
            }
          }
          break;
        }
        case 'DAY_CHECK': {
          scorableQuestions++;
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const currentDay = days[now.getDay()];
          if (this.normalizeText(answer) === this.normalizeText(currentDay)) {
            correctAnswers++;
          }
          break;
        }
        case 'MONTH_CHECK': {
          scorableQuestions++;
          const months = ['january', 'february', 'march', 'april', 'may', 'june',
                          'july', 'august', 'september', 'october', 'november', 'december'];
          const currentMonth = months[now.getMonth()];
          if (this.normalizeText(answer) === this.normalizeText(currentMonth)) {
            correctAnswers++;
          }
          break;
        }
        case 'YEAR_CHECK': {
          scorableQuestions++;
          const yearNum = parseInt(answer.replace(/[^0-9]/g, ''), 10);
          const currentYear = now.getFullYear();
          if (yearNum === currentYear || (yearNum < 100 && yearNum + 2000 === currentYear)) {
            correctAnswers++;
          }
          break;
        }
        case 'SEASON_CHECK': {
          scorableQuestions++;
          const month = now.getMonth() + 1;
          let currentSeason = 'winter';
          if (month >= 3 && month <= 5) currentSeason = 'spring';
          else if (month >= 6 && month <= 8) currentSeason = 'summer';
          else if (month >= 9 && month <= 11) currentSeason = 'fall';
          if (this.normalizeText(answer) === this.normalizeText(currentSeason)) {
            correctAnswers++;
          }
          break;
        }
        default:
          // TEXT, IMAGE, AUDIO without predefined answers - needs manual scoring, skip
          break;
      }
    });

    // Each correct answer adds 10% to the score (capped at 100)
    const base = Math.min(100, correctAnswers * 10);
    // +10% bonus if maze was solved
    this.score = this.mazeCompleted ? Math.min(100, base + 10) : base;
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.mriImageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.mriImage = e.target?.result as string;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  // --- Text-to-Speech ---
  speakQuestion(): void {
    if (this.isSpeaking) {
      this.stopSpeaking();
      return;
    }
    if (!this.currentQuestion) return;

    const utterance = new SpeechSynthesisUtterance(this.currentQuestion.text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.onend = () => { this.isSpeaking = false; };
    utterance.onerror = () => { this.isSpeaking = false; };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    this.isSpeaking = true;
  }

  stopSpeaking(): void {
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
  }

  // --- Speech Recognition ---
  toggleListening(): void {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.speechError = 'Speech recognition is not supported. Please use Chrome.';
      return;
    }

    // Seed accumulator from whatever is already typed
    this.accumulatedTranscript = this.currentQuestion.selectedAnswer || '';
    this.liveTranscript = '';
    this.speechError = '';

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event: any) => {
      this.ngZone.run(() => {
        this.speechError = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            this.accumulatedTranscript += (this.accumulatedTranscript ? ' ' : '') + result[0].transcript.trim();
            this.liveTranscript = '';
          } else {
            interim += result[0].transcript;
          }
        }
        this.liveTranscript = interim;
        const display = this.accumulatedTranscript + (interim ? ' ' + interim : '');
        this.currentQuestion.selectedAnswer = display.trim();
      });
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        if (this.isListening) {
          try { this.recognition.start(); } catch (_) { this.isListening = false; }
        }
      });
    };

    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        if (event.error === 'no-speech') return;
        if (event.error === 'aborted') return;
        this.isListening = false;
        this.liveTranscript = '';
        if (event.error === 'not-allowed') {
          this.speechError = 'Microphone access denied. Please allow microphone in your browser settings.';
        } else {
          this.speechError = `Microphone error: ${event.error}. Please try again.`;
        }
      });
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      this.speechError = 'Could not start microphone. Please try again.';
    }
  }

  stopListening(): void {
    this.isListening = false;
    this.liveTranscript = '';
    this.speechError = '';
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }

  // --- Translation ---
  translateQuestion(): void {
    if (!this.currentQuestion || this.isTranslating) return;

    // Amazigh (Tamazight) not supported
    if (this.selectedLanguage === 'amazigh') {
      this.translatedText = 'La traduction en Amazigh (Tamazight) n\'est pas encore disponible.';
      return;
    }

    // Question already in French — no need to call the API
    if (this.selectedLanguage === 'fr') {
      this.translatedText = '(La question est déjà en Français)';
      return;
    }

    this.isTranslating = true;
    this.translatedText = '';

    const text = this.currentQuestion.text;

    // Google Translate uses zh-CN for Simplified Chinese
    const langCodeMap: Record<string, string> = {
      'zh': 'zh-CN'
    };
    const targetLang = langCodeMap[this.selectedLanguage] ?? this.selectedLanguage;

    // Google Translate unofficial API (no API key, no daily quota)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        // Response format: [ [ ["translated", "original", ...], ... ], ... ]
        if (response && Array.isArray(response[0])) {
          this.translatedText = response[0]
            .map((segment: any[]) => segment[0] ?? '')
            .join('');
        } else {
          this.translatedText = 'Traduction non disponible.';
        }
        this.isTranslating = false;
      },
      error: () => {
        this.translatedText = 'Erreur de traduction. Veuillez réessayer.';
        this.isTranslating = false;
      }
    });
  }

  onLanguageChange(): void {
    if (this.translatedText) {
      this.translateQuestion();
    }
  }

  getLanguageName(code: string): string {
    const names: Record<string, string> = {
      ar: 'العربية',
      en: 'English',
      fr: 'Français',
      es: 'Español',
      de: 'Deutsch',
      zh: '中文',
      pt: 'Português',
      it: 'Italiano',
      nl: 'Nederlands',
      ru: 'Русский',
      ja: '日本語',
      ko: '한국어',
      tr: 'Türkçe',
      hi: 'हिन्दी',
      amazigh: 'ⵜⴰⵎⴰⵣⵉⵖⵜ'
    };
    return names[code] || code;
  }

  getDateParts(questionId: number): { day: string; month: string; year: string } {
    if (!this.dateParts[questionId]) {
      this.dateParts[questionId] = { day: '', month: '', year: '' };
    }
    return this.dateParts[questionId];
  }

  onDatePartChange(questionId: number): void {
    const parts = this.dateParts[questionId];
    if (!parts) return;
    const q = this.questions.find(q => q.id === questionId);
    if (q) {
      // Build a clean date string with only the filled parts
      const day = String(parts.day ?? '').trim();
      const month = String(parts.month ?? '').trim();
      const year = String(parts.year ?? '').trim();
      const filled: string[] = [];
      if (day && day !== '0') filled.push(day);
      if (month && month !== '0') filled.push(month);
      if (year && year !== '0') filled.push(year);
      q.selectedAnswer = filled.join('/');
    }
  }

  isKnownType(type: string): boolean {
    return ['TEXT', 'DATE_CHECK', 'DAY_CHECK', 'MONTH_CHECK', 'YEAR_CHECK', 'SEASON_CHECK'].includes(type);
  }

  closeModal(): void {
    this.showModal = false;
  }

  submitDiagnostic(): void {
    this.isSubmitting = true;
    this.submitMessage = '';

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.isSubmitting = false;
      this.submitMessage = 'Error: you must be logged in to submit the diagnostic.';
      return;
    }

    const payload = {
      userId: user.id,
      titre: 'Cognitive Assessment - ' + new Date().toLocaleDateString('en-US'),
      mazeCompleted: this.mazeCompleted,
      reponses: this.questions.map(q => ({
        questionId: q.id,
        reponseText: q.selectedAnswer,
        tempsReponseSecondes: Math.round(q.timeSpent * 10) / 10
      }))
    };

    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    if (this.mriImageFile) {
      formData.append('file', this.mriImageFile);
    }

    this.http.post<any>('http://localhost:9090/api/diagnostics/submit-with-image', formData).subscribe({
      next: (response) => {
        // Use the backend's fully-computed aiScore (responses + maze + IRM penalty)
        if (response.diagnostic?.aiScore != null) {
          this.score = Math.round(response.diagnostic.aiScore);
        } else if (response.pourcentageReussite != null) {
          const backend = Math.round(response.pourcentageReussite);
          this.score = this.mazeCompleted ? Math.min(100, backend + 10) : backend;
        }
        this.isSubmitting = false;
        this.router.navigate(['/confirmation'], { state: { score: this.score } });
      },
      error: () => {
        this.isSubmitting = false;
        this.submitMessage = 'Error during submission. Please try again.';
      }
    });
  }
}
