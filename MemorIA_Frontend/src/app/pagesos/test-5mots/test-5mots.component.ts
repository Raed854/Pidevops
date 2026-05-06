import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = 'ENCODAGE' | 'RAPPEL_IMMEDIAT' | 'DISTRACTEUR' | 'RAPPEL_LIBRE' | 'RAPPEL_INDICE' | 'TERMINE';

const PHASE_SEQUENCE: Phase[] = [
  'ENCODAGE', 'RAPPEL_IMMEDIAT', 'DISTRACTEUR', 'RAPPEL_LIBRE', 'RAPPEL_INDICE', 'TERMINE'
];

interface Mot {
  id: number;
  word: string;
  category: string;
  orderIndex: number;
  rappelLibre?: boolean;
  rappelIndice?: boolean;
  score?: number;
}

interface TestResult {
  word: string;
  category: string;
  rappelLibre: boolean;
  rappelIndice: boolean;
  score: number;
  rappelLibreReponse?: string;
  rappelIndiceReponse?: string;
}

// ── Default words (fallback if backend fails) ─────────────────────────────

const DEFAULT_MOTS: Mot[] = [
  { id: 1, word: 'LIMONADE', category: 'une boisson',    orderIndex: 0 },
  { id: 2, word: 'SAPIN',    category: 'un arbre',       orderIndex: 1 },
  { id: 3, word: 'CAMION',   category: 'un véhicule',    orderIndex: 2 },
  { id: 4, word: 'GUITARE',  category: 'un instrument',  orderIndex: 3 },
  { id: 5, word: 'BANANE',   category: 'un fruit',       orderIndex: 4 },
];

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-test-5mots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-5mots.component.html',
  styleUrls: ['./test-5mots.component.css']
})
export class Test5MotsComponent implements OnInit, OnDestroy {

  private router   = inject(Router);
  private route    = inject(ActivatedRoute);
  private http     = inject(HttpClient);
  private apiUrl   = environment.apiUrl;

  // ── State signals ──────────────────────────────────────────────────────

  currentPhase       = signal<Phase>('ENCODAGE');
  mots               = signal<Mot[]>([]);
  mots5TestId        = signal<number>(0);
  patientId          = signal<number>(0);
  assignationId      = signal<number | null>(null);

  // Encodage
  currentEncodageIndex = signal<number>(0);

  // Rappel Immédiat
  rappelImmediatAnswers: string[] = [];

  // Distracteur
  distracteurTimeRemaining = signal<number>(180);
  distracteurDone          = signal<boolean>(false);
  private distracteurInterval: any;

  // Rappel Libre
  rappelLibreAnswers: string[] = [];

  // Rappel Indicé
  rappelIndiceAnswers: { [key: number]: string } = {};

  // Results
  testResults = signal<TestResult[]>([]);
  totalScore  = signal<number>(0);

  // ── Computed ───────────────────────────────────────────────────────────

  currentPhaseLabel = computed(() => {
    const labels: Record<Phase, string> = {
      ENCODAGE:       'Encodage',
      RAPPEL_IMMEDIAT:'Rappel Immédiat',
      DISTRACTEUR:    'Distraction',
      RAPPEL_LIBRE:   'Rappel Libre',
      RAPPEL_INDICE:  'Rappel Indicé',
      TERMINE:        'Résultats'
    };
    return labels[this.currentPhase()];
  });

  currentPhaseIndex = computed(() => {
    const idx = PHASE_SEQUENCE.indexOf(this.currentPhase());
    return idx >= 0 ? idx + 1 : 1;
  });

  currentEncodageWord = computed(() =>
    this.mots()[this.currentEncodageIndex()] ?? null
  );

  isLastEncodageWord = computed(() =>
    this.currentEncodageIndex() === this.mots().length - 1
  );

  formattedDistracteurTime = computed(() => {
    const t = this.distracteurTimeRemaining();
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  distracteurProgressPct = computed(() =>
    Math.round(((180 - this.distracteurTimeRemaining()) / 180) * 100)
  );

  motsForIndice = computed(() =>
    this.mots().filter(m => !m.rappelLibre)
  );

  motsAlreadyRecalled = computed(() =>
    this.mots().filter(m => m.rappelLibre).length
  );

  interpretation = computed(() =>
    this.totalScore() >= 8 ? 'Score dans la norme' : 'Possible trouble mnésique'
  );

  todayDate = computed(() =>
    new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  );

  // ── Lifecycle ──────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const testId       = params['testId']       ? +params['testId']       : 1;
      const patientId    = params['patientId']    ? +params['patientId']    : 1;
      const assignationId= params['assignationId']? +params['assignationId']: null;

      this.patientId.set(patientId);
      this.assignationId.set(assignationId);
      this.loadTestData(testId, patientId, assignationId ?? undefined);
    });
  }

  ngOnDestroy(): void {
    this.clearDistracteurTimer();
  }

  // ── Data loading ───────────────────────────────────────────────────────

  private loadTestData(testId: number, patientId: number, assignationId?: number): void {
    const params: Record<string, any> = { testId, patientId };
    if (assignationId) params['assignationId'] = assignationId;

    this.http.get<any>(`${this.apiUrl}/test/5mots/questions`, { params }).subscribe({
      next: (res) => {
        const serverMots: Mot[] = res.words?.length ? res.words : DEFAULT_MOTS;
        this.initTest(res.testId ?? testId, serverMots, 'ENCODAGE');
      },
      error: () => {
        // Backend indisponible → mode hors-ligne complet
        this.initTest(testId, DEFAULT_MOTS, 'ENCODAGE');
      }
    });
  }

  private initTest(testId: number, mots: Mot[], startPhase: Phase): void {
    this.mots5TestId.set(testId);
    this.mots.set(mots);
    this.currentPhase.set(startPhase);
    this.currentEncodageIndex.set(0);
    this.rappelImmediatAnswers = new Array(mots.length).fill('');
    this.rappelLibreAnswers    = new Array(mots.length).fill('');
    this.rappelIndiceAnswers   = {};
    this.distracteurTimeRemaining.set(180);
    this.distracteurDone.set(false);
    this.testResults.set([]);
    this.totalScore.set(0);
  }

  // ── Phase navigation (local — ne dépend pas du backend) ────────────────

  private goToNextPhase(): void {
    const idx = PHASE_SEQUENCE.indexOf(this.currentPhase());
    const next = idx < PHASE_SEQUENCE.length - 1
      ? PHASE_SEQUENCE[idx + 1]
      : 'TERMINE';
    this.currentPhase.set(next);
  }

  /** Optionnel : notifie le backend du changement de phase, sans bloquer l'UI */
  private notifyBackendPhase(): void {
    this.http.post<any>(
      `${this.apiUrl}/test/5mots/phase/${this.mots5TestId()}`, {}
    ).subscribe({ error: () => {} }); // silencieux
  }

  // ── PHASE 1 — ENCODAGE ────────────────────────────────────────────────

  nextEncodageWord(): void {
    if (this.isLastEncodageWord()) {
      this.goToNextPhase();
      this.notifyBackendPhase();
    } else {
      this.currentEncodageIndex.update(i => i + 1);
    }
  }

  // ── PHASE 2 — RAPPEL IMMÉDIAT ─────────────────────────────────────────

  canSubmitRappelImmediat(): boolean {
    return this.rappelImmediatAnswers.some(a => a.trim().length > 0);
  }

  submitRappelImmediat(): void {
    const responses = this.mots().map((mot, idx) => ({
      motItemId: mot.id,
      answerText: this.rappelImmediatAnswers[idx] || '',
      timeTakenSeconds: 0
    }));

    this.http.post<any>(`${this.apiUrl}/test/5mots/reponse/batch`, {
      mots5TestId: this.mots5TestId(),
      phase: 'RAPPEL_IMMEDIAT',
      responses
    }).subscribe({
      next:  () => { this.goToNextPhase(); this.startDistracteurTimer(); },
      error: () => { this.goToNextPhase(); this.startDistracteurTimer(); } // fallback
    });
  }

  // ── PHASE 3 — DISTRACTEUR ─────────────────────────────────────────────

  private startDistracteurTimer(): void {
    this.clearDistracteurTimer();
    this.distracteurTimeRemaining.set(180);
    this.distracteurDone.set(false);

    this.distracteurInterval = setInterval(() => {
      const remaining = this.distracteurTimeRemaining();
      if (remaining <= 1) {
        this.clearDistracteurTimer();
        this.distracteurTimeRemaining.set(0);
        this.distracteurDone.set(true);
      } else {
        this.distracteurTimeRemaining.update(t => t - 1);
      }
    }, 1000);
  }

  private clearDistracteurTimer(): void {
    if (this.distracteurInterval) {
      clearInterval(this.distracteurInterval);
      this.distracteurInterval = null;
    }
  }

  finishDistracteur(): void {
    this.clearDistracteurTimer();
    this.goToNextPhase();
    this.notifyBackendPhase();
  }

  // ── PHASE 4 — RAPPEL LIBRE ────────────────────────────────────────────

  canSubmitRappelLibre(): boolean {
    return this.rappelLibreAnswers.some(a => a.trim().length > 0);
  }

  submitRappelLibre(): void {
    // Marquer localement les mots rappelés (comparaison insensible à la casse)
    const normalize = (s: string) =>
      s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const updatedMots = this.mots().map((mot, idx) => {
      const ans = this.rappelLibreAnswers[idx] || '';
      const found = normalize(ans) === normalize(mot.word);
      return { ...mot, rappelLibre: found };
    });
    this.mots.set(updatedMots);

    const responses = this.mots().map((mot, idx) => ({
      motItemId: mot.id,
      answerText: this.rappelLibreAnswers[idx] || '',
      timeTakenSeconds: 0
    }));

    this.http.post<any>(`${this.apiUrl}/test/5mots/reponse/batch`, {
      mots5TestId: this.mots5TestId(),
      phase: 'RAPPEL_LIBRE',
      responses
    }).subscribe({
      next:  () => this.goToNextPhase(),
      error: () => this.goToNextPhase() // fallback
    });
  }

  // ── PHASE 5 — RAPPEL INDICÉ ───────────────────────────────────────────

  submitRappelIndice(): void {
    const normalize = (s: string) =>
      s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const updatedMots = this.mots().map(mot => {
      if (mot.rappelLibre) return mot; // déjà rappelé
      const ans = this.rappelIndiceAnswers[mot.id] || '';
      const found = ans.trim().length > 0 && normalize(ans) === normalize(mot.word);
      return { ...mot, rappelIndice: found };
    });
    this.mots.set(updatedMots);

    const motsNeedingIndice = this.motsForIndice();
    const responses = motsNeedingIndice.map(mot => ({
      motItemId: mot.id,
      answerText: this.rappelIndiceAnswers[mot.id] || '',
      timeTakenSeconds: 0
    }));

    this.http.post<any>(`${this.apiUrl}/test/5mots/reponse/batch`, {
      mots5TestId: this.mots5TestId(),
      phase: 'RAPPEL_INDICE',
      responses
    }).subscribe({
      next:  () => this.finishTest(),
      error: () => this.finishTest() // fallback
    });
  }

  // ── PHASE 6 — RÉSULTATS ───────────────────────────────────────────────

  finishTest(): void {
    // Calcul local du score (2 = rappel libre, 1 = indicé seulement, 0 = rien)
    const results: TestResult[] = this.mots().map((mot, idx) => {
      const libre = mot.rappelLibre === true;
      const indice = !libre && (mot.rappelIndice === true);
      const score = libre ? 2 : indice ? 1 : 0;
      return {
        word:               mot.word,
        category:           mot.category,
        rappelLibre:        libre,
        rappelIndice:       indice,
        score,
        rappelLibreReponse:  this.rappelLibreAnswers[idx] || undefined,
        rappelIndiceReponse: this.rappelIndiceAnswers[mot.id] || undefined,
      };
    });

    const total = results.reduce((s, r) => s + r.score, 0);
    this.testResults.set(results);
    this.totalScore.set(total);
    this.currentPhase.set('TERMINE');

    // Sauvegarder côté backend (silencieux)
    this.http.post(`${this.apiUrl}/tests/1/results`, {
      patientId:       this.patientId(),
      testId:          this.mots5TestId(),
      assignationId:   this.assignationId(),
      score:           total,
      durationSeconds: 0
    }).subscribe({ error: () => {} });
  }

  restartTest(): void {
    this.loadTestData(this.mots5TestId(), this.patientId(), this.assignationId() ?? undefined);
  }

  returnToDashboard(): void {
    this.router.navigate(['/tests-cognitifs']);
  }
}