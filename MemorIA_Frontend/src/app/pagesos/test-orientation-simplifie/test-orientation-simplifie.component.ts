import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface OrientationQuestion {
  id: number;
  questionText: string;
  hint: string;
  instruction: string;
  placeholder?: string;
  type: 'mcq' | 'text';
  options?: string[];
  correctAnswer: string;  // Réponse attendue (calculée dynamiquement)
}

@Component({
  selector: 'app-test-orientation-simplifie',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-orientation-simplifie.component.html',
  styleUrls: ['./test-orientation-simplifie.component.css']
})
export class TestOrientationSimplifieComponent implements OnInit, OnDestroy {
  private router       = inject(Router);
  private route        = inject(ActivatedRoute);
  private http         = inject(HttpClient);
  private apiUrl       = environment.apiUrl;
  private timerInterval: any;

  patientName    = signal('Patient');
  patientId      = signal<number>(0);
  assignationId  = signal<number | null>(null);
  elapsedSeconds = signal(0);
  currentIndex   = signal(0);
  answers        = signal<{ [key: number]: string }>({});
  isComplete     = signal(false);
  finalScore     = signal(0);
  showFeedback   = signal(false);
  detectedCity   = signal('');

  // ── Build questions dynamically from system clock ──────────────────

  private buildQuestions(): OrientationQuestion[] {
    const now   = new Date();
    const city  = this.detectedCity() || 'votre ville';

    const days   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

    const dayName   = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const year      = now.getFullYear().toString();
    const dateStr   = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${year}`;

    const m = now.getMonth() + 1; // 1-12
    let season: string;
    if (m >= 3 && m <= 5)       season = 'Printemps';
    else if (m >= 6 && m <= 8)  season = 'Été';
    else if (m >= 9 && m <= 11) season = 'Automne';
    else                         season = 'Hiver';

    return [
      {
        id: 1,
        questionText: 'Quel jour de la semaine sommes-nous ?',
        hint: '',
        instruction: 'Sélectionnez le bon jour.',
        type: 'mcq',
        options: ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'],
        correctAnswer: dayName
      },
      {
        id: 2,
        questionText: 'En quelle date sommes-nous ?',
        hint: '',
        instruction: 'Saisissez la date du jour.',
        placeholder: 'Ex : 01/03/2026',
        type: 'text',
        correctAnswer: dateStr
      },
      {
        id: 3,
        questionText: 'En quel mois sommes-nous ?',
        hint: '',
        instruction: 'Sélectionnez le mois actuel.',
        type: 'mcq',
        options: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
        correctAnswer: monthName
      },
      {
        id: 4,
        questionText: 'En quelle année sommes-nous ?',
        hint: '',
        instruction: 'Saisissez l\'année actuelle.',
        placeholder: 'Ex : 2026',
        type: 'text',
        correctAnswer: year
      },
      {
        id: 5,
        questionText: 'En quelle saison sommes-nous ?',
        hint: '',
        instruction: 'Sélectionnez la saison.',
        type: 'mcq',
        options: ['Printemps','Été','Automne','Hiver'],
        correctAnswer: season
      },
      {
        id: 6,
        questionText: 'Dans quel pays vivez-vous ?',
        hint: '',
        instruction: 'Sélectionnez votre pays.',
        type: 'mcq',
        options: ['France','Belgique','Suisse','Maroc','Tunisie','Canada','Algérie'],
        correctAnswer: ''   // pas de vérification automatique — réponse libre
      },
      {
        id: 7,
        questionText: 'Dans quelle ville êtes-vous ?',
        hint: city !== 'votre ville' ? `Ville détectée : ${city}` : 'Ville actuelle',
        instruction: 'Saisissez le nom de votre ville.',
        placeholder: 'Ex : Paris',
        type: 'text',
        correctAnswer: city
      },
      {
        id: 8,
        questionText: 'Quel est votre prénom ?',
        hint: '',
        instruction: 'Saisissez votre prénom.',
        placeholder: 'Votre prénom',
        type: 'text',
        correctAnswer: ''   // Vérification manuelle par le praticien
      },
      {
        id: 9,
        questionText: 'En quelle année êtes-vous né(e) ?',
        hint: '',
        instruction: 'Saisissez votre année de naissance.',
        placeholder: 'Ex : 1955',
        type: 'text',
        correctAnswer: ''   // Vérification manuelle par le praticien
      },
    ];
  }

  questions: OrientationQuestion[] = [];

  totalQuestions   = computed(() => this.questions.length);
  currentQuestion  = computed(() => this.questions[this.currentIndex()]);
  isLastQuestion   = computed(() => this.currentIndex() === this.questions.length - 1);

  progressPercentage = computed(() =>
    Math.round((this.currentIndex() / Math.max(this.totalQuestions(), 1)) * 100)
  );

  currentScore = computed(() => {
    const ans = this.answers();
    let score = 0;
    this.questions.forEach(q => {
      if (q.correctAnswer && ans[q.id]) {
        if (this.checkAnswer(ans[q.id], q.correctAnswer)) score++;
      } else if (!q.correctAnswer && ans[q.id]?.trim()) {
        // Questions sans correctAnswer auto (pays, prénom, naissance) : point si répondu
        score++;
      }
    });
    return score;
  });

  formattedTime = computed(() => {
    const m = Math.floor(this.elapsedSeconds() / 60);
    const s = this.elapsedSeconds() % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  // ── Lifecycle ────────────────────────────────────────────────────────

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['patientId'])     this.patientId.set(+params['patientId']);
      if (params['assignationId']) this.assignationId.set(+params['assignationId']);
      this.loadPatientInfo();
    });

    // 1. Detect city via Geolocation → reverse geocoding
    this.detectCity().then(() => {
      this.questions = this.buildQuestions();
    });

    this.startTimer();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  // ── Geolocation ─────────────────────────────────────────────────────

  private async detectCity(): Promise<void> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { this.questions = this.buildQuestions(); resolve(); return; }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=fr`
            );
            const data = await res.json();
            const city =
              data?.address?.city ||
              data?.address?.town ||
              data?.address?.village ||
              data?.address?.municipality ||
              '';
            this.detectedCity.set(city);
          } catch {
            // Geocoding failed — city stays empty
          }
          resolve();
        },
        () => { resolve(); }, // Permission denied or error
        { timeout: 5000 }
      );
    });
  }

  private startTimer() {
    this.timerInterval = setInterval(() => this.elapsedSeconds.update(s => s + 1), 1000);
  }

  private loadPatientInfo() {
    const pid = this.patientId();
    if (!pid) return;
    this.http.get<any[]>(`${this.apiUrl}/assignations/patient/${pid}/tests`).subscribe({
      next: (assignments) => {
        if (assignments?.length > 0) {
          const a = assignments[0];
          this.patientName.set(
            `${a.patientPrenom || a.patient?.prenom || ''} ${a.patientNom || a.patient?.nom || ''}`.trim() || 'Patient'
          );
        }
      },
      error: () => {
        this.http.get<any>(`${this.apiUrl}/users/${pid}`).subscribe({
          next:  (u) => this.patientName.set(`${u.prenom || ''} ${u.nom || ''}`.trim() || 'Patient'),
          error: () => {}
        });
      }
    });
  }

  // ── Answer helpers ───────────────────────────────────────────────────

  /** Normalize and compare answers (trim, lowercase, accents stripped) */
  private checkAnswer(userAnswer: string, correct: string): boolean {
    if (!correct) return true; // no auto-check
    const normalize = (s: string) =>
      s.trim().toLowerCase()
       .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalize(userAnswer) === normalize(correct);
  }

  isCurrentAnswerCorrect(): boolean {
    const q = this.currentQuestion();
    if (!q?.correctAnswer) return true; // manual questions always pass
    return this.checkAnswer(this.getAnswer(q.id), q.correctAnswer);
  }

  selectOption(option: string) {
    const q = this.currentQuestion();
    if (!q) return;
    this.answers.update(a => ({ ...a, [q.id]: option }));
    this.showFeedback.set(true);
  }

  getAnswer(id: number): string {
    return this.answers()[id] || '';
  }

  setAnswer(event: Event, id: number) {
    const val = (event.target as HTMLInputElement).value;
    this.answers.update(a => ({ ...a, [id]: val }));
    this.showFeedback.set(false); // reset feedback while typing
  }

  isSelected(option: string): boolean {
    const q = this.currentQuestion();
    return !!q && this.answers()[q.id] === option;
  }

  // ── Navigation ───────────────────────────────────────────────────────

  goNext() {
    this.showFeedback.set(false);
    if (this.isLastQuestion()) this.finishTest();
    else this.currentIndex.update(i => i + 1);
  }

  goPrev() {
    if (this.currentIndex() > 0) {
      this.showFeedback.set(false);
      this.currentIndex.update(i => i - 1);
    }
  }

  private finishTest() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.finalScore.set(this.currentScore());
    this.isComplete.set(true);
    this.saveResults();
  }

  private saveResults() {
    const payload = {
      patientId:       this.patientId(),
      testId:          10,
      assignationId:   this.assignationId(),
      score:           this.finalScore(),
      durationSeconds: this.elapsedSeconds(),
      answers: Object.entries(this.answers()).map(([qId, ans]) => ({
        questionId: parseInt(qId),
        answerText: ans
      }))
    };
    this.http.post(`${this.apiUrl}/tests/10/results`, payload).subscribe({ error: () => {} });
  }

  returnToDashboard() {
    this.router.navigate(['/tests-cognitifs']);
  }
}