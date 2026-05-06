import { Component, OnInit, OnDestroy, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Clock, Star, ListChecks, ChevronRight, CheckCircle2, XCircle
} from 'lucide-angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TestResultService } from '../../services/test-result.service';
import { TestResult, SeverityLevel } from '../../models/cognitive-models';

/* ═══════════════════════════════════════════════════════════════
 *  INTERFACES
 * ═══════════════════════════════════════════════════════════════ */
interface SortItem {
  id: number;
  name: string;
  emoji: string;
  categoryId: string; // réponse attendue
}

interface Category {
  id: string;
  name: string;
  emoji: string;
}

interface SortResult {
  itemId: number;
  name: string;
  emoji: string;
  givenCategory: string;
  expectedCategory: string;
  isCorrect: boolean;
  score: number;
}

/* ═══════════════════════════════════════════════════════════════
 *  DONNÉES DU TEST
 *  4 catégories × 5 objets = 20 objets à trier
 * ═══════════════════════════════════════════════════════════════ */
const TEST_CATEGORIES: Category[] = [
  { id: 'fruit',    name: 'Fruits',    emoji: '🍎' },
  { id: 'animal',   name: 'Animaux',   emoji: '🐾' },
  { id: 'meuble',   name: 'Meubles',   emoji: '🪑' },
  { id: 'vetement', name: 'Vêtements', emoji: '👕' },
];

const TEST_ITEMS: SortItem[] = [
  // Fruits
  { id:  1, name: 'Banane',    emoji: '🍌', categoryId: 'fruit'    },
  { id:  2, name: 'Fraise',    emoji: '🍓', categoryId: 'fruit'    },
  { id:  3, name: 'Raisin',    emoji: '🍇', categoryId: 'fruit'    },
  { id:  4, name: 'Citron',    emoji: '🍋', categoryId: 'fruit'    },
  { id:  5, name: 'Cerise',    emoji: '🍒', categoryId: 'fruit'    },
  // Animaux
  { id:  6, name: 'Chien',     emoji: '🐶', categoryId: 'animal'   },
  { id:  7, name: 'Chat',      emoji: '🐱', categoryId: 'animal'   },
  { id:  8, name: 'Lapin',     emoji: '🐰', categoryId: 'animal'   },
  { id:  9, name: 'Tigre',     emoji: '🐯', categoryId: 'animal'   },
  { id: 10, name: 'Dauphin',   emoji: '🐬', categoryId: 'animal'   },
  // Meubles
  { id: 11, name: 'Chaise',    emoji: '🪑', categoryId: 'meuble'   },
  { id: 12, name: 'Table',     emoji: '🪵', categoryId: 'meuble'   },
  { id: 13, name: 'Lit',       emoji: '🛏️',  categoryId: 'meuble'   },
  { id: 14, name: 'Armoire',   emoji: '🗄️',  categoryId: 'meuble'   },
  { id: 15, name: 'Canapé',    emoji: '🛋️',  categoryId: 'meuble'   },
  // Vêtements
  { id: 16, name: 'Chapeau',   emoji: '🎩', categoryId: 'vetement' },
  { id: 17, name: 'Manteau',   emoji: '🧥', categoryId: 'vetement' },
  { id: 18, name: 'Chaussure', emoji: '👟', categoryId: 'vetement' },
  { id: 19, name: 'Écharpe',   emoji: '🧣', categoryId: 'vetement' },
  { id: 20, name: 'Gant',      emoji: '🧤', categoryId: 'vetement' },
];

@Component({
  selector: 'app-tri-objets',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterModule],
  templateUrl: './tri-objets.component.html',
  styleUrl:    './tri-objets.component.css'
})
export class TriObjetsComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private testResultService = inject(TestResultService);

  readonly icons = { Clock, Star, ListChecks, ChevronRight, CheckCircle2, XCircle };

  /* ── État général ─────────────────────────────────────────────── */
  assignmentId = signal<number | null>(null);
  currentPhase = signal<'INSTRUCTIONS' | 'PLAY' | 'VALIDATION' | 'RESULTS'>('INSTRUCTIONS');
  testId       = signal<number>(27);
  patientId    = signal<number>(36);

  /* ── Timer ────────────────────────────────────────────────────── */
  readonly totalTimeSeconds = 120;
  timeLeftSeconds = signal(this.totalTimeSeconds);
  timerInterval: any;

  /* ── Données de jeu ───────────────────────────────────────────── */
  readonly categories = TEST_CATEGORIES;
  private shuffledItems: SortItem[] = [];

  // ✅ FIX #1 : currentIndex est maintenant un signal pour que
  //            currentItem() et progressPercentage se mettent à jour
  //            automatiquement dans le template Angular.
  currentIndex  = signal<number>(0);

  currentScore  = 0;
  feedbackState: 'idle' | 'correct' | 'wrong' = 'idle';
  feedbackTimeout: any;
  isAnimating   = false;
  dragOverCategory: string | null = null;

  // Compteur par catégorie (tous les dépôts, bonnes et mauvaises réponses)
  categoryCountMap = signal<Record<string, number>>({});

  /* ── Résultats ────────────────────────────────────────────────── */
  results    = signal<SortResult[]>([]);
  totalScore = computed(() => this.results().reduce((s, r) => s + r.score, 0));
  readonly maxScore = TEST_ITEMS.length;
  timeSpentStr = '';

  accuracy = computed(() => {
    const r = this.results();
    if (!r.length) return 0;
    return Math.round(r.filter(x => x.isCorrect).length / r.length * 100);
  });

  // ✅ FIX #1 (suite) : currentItem dépend maintenant du signal currentIndex
  currentItem = computed(() => {
    const idx = this.currentIndex();
    if (idx < 0 || idx >= this.shuffledItems.length) return null;
    return this.shuffledItems[idx] ?? null;
  });

  get totalItems() { return this.shuffledItems.length; }

  // ✅ FIX #4 : progressPercentage utilise le signal currentIndex
  get progressPercentage() {
    if (this.totalItems === 0) return 0;
    return Math.round((this.currentIndex() / this.totalItems) * 100);
  }

  get allItemsProcessed() {
    return this.results().length >= this.totalItems;
  }

  /* ══════════════════════════════════════════════════════════════
   *  CYCLE DE VIE
   * ══════════════════════════════════════════════════════════════ */
  ngOnInit() {
    this.route.queryParams.subscribe((params: any) => {
      const id = params['assignationId'] || params['assignmentId'];
      if (id) this.assignmentId.set(Number(id));

      const patientId = params['patientId'];
      if (patientId) {
        this.patientId.set(Number(patientId));
      } else {
        this.patientId.set(Number(localStorage.getItem('patientId')) || 36);
      }

      const testId = params['testId'];
      if (testId) this.testId.set(Number(testId));
    });
  }

  ngOnDestroy() {
    this.clearTimers();
  }

  private clearTimers() {
    if (this.timerInterval)   clearInterval(this.timerInterval);
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
  }

  /* ══════════════════════════════════════════════════════════════
   *  DÉMARRAGE
   * ══════════════════════════════════════════════════════════════ */
  startTest() {
    this.shuffledItems = [...TEST_ITEMS].sort(() => Math.random() - 0.5);

    // ✅ FIX #1 : reset via signal
    this.currentIndex.set(0);
    this.currentScore  = 0;
    this.feedbackState = 'idle';
    this.isAnimating   = false;
    this.results.set([]);

    // ✅ FIX #2 : réinitialiser le timer à chaque démarrage
    this.timeLeftSeconds.set(this.totalTimeSeconds);

    // ✅ FIX #3 : réinitialiser le compteur de catégories comme signal
    this.categoryCountMap.set(
      Object.fromEntries(TEST_CATEGORIES.map(c => [c.id, 0]))
    );

    this.currentPhase.set('PLAY');
    this.startTimer();
  }

  private startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeLeftSeconds.update(v => {
        if (v <= 1) { this.finishTest(); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  formatTime(s: number): string {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  /* ══════════════════════════════════════════════════════════════
   *  INTERACTIONS — CLIC & DRAG-AND-DROP
   * ══════════════════════════════════════════════════════════════ */
  onCategoryClick(categoryId: string) {
    if (this.feedbackState !== 'idle' || !this.currentItem()) return;
    this.processAnswer(categoryId);
  }

  onDragStart(event: DragEvent) {
    event.dataTransfer?.setData('text/plain', 'current-item');
  }

  onDragOver(event: DragEvent, categoryId: string) {
    event.preventDefault();
    this.dragOverCategory = categoryId;
  }

  onDragLeave() {
    this.dragOverCategory = null;
  }

  onDrop(event: DragEvent, categoryId: string) {
    event.preventDefault();
    this.dragOverCategory = null;
    if (this.feedbackState !== 'idle' || !this.currentItem()) return;
    this.processAnswer(categoryId);
  }

  /** Passer l'objet courant (compté comme faux) */
  skipItem() {
    if (!this.currentItem() || this.feedbackState !== 'idle') return;
    const item = this.currentItem()!;

    this.results.update(prev => [...prev, {
      itemId: item.id,
      name: item.name,
      emoji: item.emoji,
      givenCategory: '—',
      expectedCategory: this.categories.find(c => c.id === item.categoryId)?.name ?? '',
      isCorrect: false,
      score: 0,
    }]);

    // ✅ FIX #1 : incrémenter via signal
    const next = this.currentIndex() + 1;
    this.currentIndex.set(next);

    if (next >= this.shuffledItems.length) {
      this.finishTest();
    }
  }

  /* ══════════════════════════════════════════════════════════════
   *  LOGIQUE DE RÉPONSE
   * ══════════════════════════════════════════════════════════════ */
  private processAnswer(givenCategoryId: string) {
    const item = this.currentItem()!;
    const isCorrect  = givenCategoryId === item.categoryId;
    const catName    = this.categories.find(c => c.id === givenCategoryId)?.name ?? '—';
    const expectedName = this.categories.find(c => c.id === item.categoryId)?.name ?? '';

    if (isCorrect) {
      this.currentScore++;
    }
    this.feedbackState = isCorrect ? 'correct' : 'wrong';

    // ✅ FIX #3 : tous les dépôts (pas seulement les bons) sont comptés,
    //            et on met à jour via signal pour déclencher la détection.
    this.categoryCountMap.update(map => ({
      ...map,
      [givenCategoryId]: (map[givenCategoryId] ?? 0) + 1,
    }));

    this.results.update(prev => [...prev, {
      itemId: item.id,
      name: item.name,
      emoji: item.emoji,
      givenCategory: catName,
      expectedCategory: expectedName,
      isCorrect,
      score: isCorrect ? 1 : 0,
    }]);

    this.isAnimating = true;

    this.feedbackTimeout = setTimeout(() => {
      this.feedbackState = 'idle';
      this.isAnimating   = false;

      // ✅ FIX #1 : incrémenter via signal
      const next = this.currentIndex() + 1;
      this.currentIndex.set(next);

      if (next >= this.shuffledItems.length) {
        this.finishTest();
      }
    }, 800);
  }

  // ✅ FIX #3 : lecture depuis le signal
  getCategoryCount(categoryId: string): number {
    return this.categoryCountMap()[categoryId] ?? 0;
  }

  /* ══════════════════════════════════════════════════════════════
   *  VALIDATION & FIN
   * ══════════════════════════════════════════════════════════════ */
  validatePrompt()   { this.currentPhase.set('VALIDATION'); }
  cancelValidation() { this.currentPhase.set('PLAY'); }

  finishTest() {
    this.clearTimers();
    const spent = this.totalTimeSeconds - this.timeLeftSeconds();
    this.timeSpentStr = `${Math.floor(spent / 60)} min ${spent % 60} sec`;
    this.saveResult();
    this.currentPhase.set('RESULTS');
  }

  private saveResult() {
    const score = this.totalScore();
    const result: TestResult = {
      patientId:        this.patientId(),
      assignmentId:     this.assignmentId() ?? undefined,
      scoreTotale:      score,
      maxPossibleScore: this.maxScore,
      scorePercentage:  (score / this.maxScore) * 100,
      testDate:         new Date().toISOString(),
      durationSeconds:  this.totalTimeSeconds - this.timeLeftSeconds(),
      isValid:          true,
      severityLevel:
        score >= 16 ? SeverityLevel.NORMAL :
        score >= 10 ? SeverityLevel.MILD   : SeverityLevel.SEVERE
    };
    this.testResultService.create(result).subscribe({
      next:  (res: any) => console.log('Résultat sauvegardé :', res),
      error: (err: any) => console.error('Erreur sauvegarde :', err),
    });
  }

  /* ── Raccourcis clavier ──────────────────────────────────────── */
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.currentPhase() === 'VALIDATION') this.cancelValidation();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.currentPhase() !== 'PLAY') return;
    const idx = parseInt(event.key, 10) - 1;
    if (idx >= 0 && idx < this.categories.length) {
      event.preventDefault();
      this.onCategoryClick(this.categories[idx].id);
    }
  }

  exit() {
    this.router.navigate(['/tests-cognitifs']);
  }
}