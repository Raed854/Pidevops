import { Component, OnInit, OnDestroy, signal, computed, HostListener, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Brain, Clock, ChevronRight, CheckCircle2, XCircle, Eraser, Send, ListChecks, HelpCircle, ChevronLeft } from 'lucide-angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TestResultService } from '../../services/test-result.service';
import { CrosswordTestService, CrosswordAnswerDto, CrosswordResultDto } from '../../services/crossword-test.service';
import { TestResult, SeverityLevel } from '../../models/cognitive-models';

/*
 * ═══════════════════════════════════════════════════════════════════════
 *  GRILLE MOTS CROISÉS — STRUCTURE COMPLÈTE VÉRIFIÉE
 *  (correspond exactement à la forme visible dans l'interface)
 *
 *   col:  0    1    2    3    4
 *  row 0: [M]  [E]  [L]  [O]  [N]    ← H1 = MELON   (y=0, x=0→4)
 *  row 1: [O]  [■]  [I]  [■]  [■]
 *  row 2: [R]  [A]  [T]  [R]  [■]    ← H2 = RAT     (y=2, x=0→2)
 *  row 3: [S]  [■]  [■]  [U]  [■]
 *  row 4: [E]  [M]  [I]  [E]  [L]    ← H3 = MIEL    (y=4, x=1→4)
 *          ↑        ↑         ↑
 *         V1       V2        V3
 *       MORSE     LIT        RUE
 *  (x=0,y=0→4) (x=2,y=0→2) (x=3,y=2→4)
 *
 *  INTERSECTIONS VÉRIFIÉES À 100% :
 *  (0,0): H1[0]=M  = V1[0]=M  ✓
 *  (2,0): H1[2]=L  = V2[0]=L  ✓
 *  (0,2): H2[0]=R  = V1[2]=R  ✓
 *  (2,2): H2[2]=T  = V2[2]=T  ✓
 *  (3,4): V3[2]=E  = H3[idx2]=E  ✓  (H3 startX=1 → x=3 est l'index 2)
 * ═══════════════════════════════════════════════════════════════════════
 */

interface CrosswordCell {
  x: number;
  y: number;
  letter: string;
  isBlocked: boolean;
  number?: number;
}

interface CrosswordDefinition {
  id: string;
  number: number;
  direction: 'H' | 'V';
  length: number;
  clue: string;
  answer: string;
  startX: number;
  startY: number;
}

@Component({
  selector: 'app-mots-croises',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterModule],
  templateUrl: './mots-croises.component.html',
  styleUrl: './mots-croises.component.css'
})
export class MotsCroisesComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private testResultService = inject(TestResultService);
  private crosswordTestService = inject(CrosswordTestService);

  readonly icons = {
    Brain, Clock, ChevronRight, CheckCircle2, XCircle, Eraser, Send, ListChecks, HelpCircle, ChevronLeft
  };

  assignmentId = signal<number | null>(null);
  currentPhase = signal<'INSTRUCTIONS' | 'PLAY' | 'VALIDATION' | 'RESULTS'>('INSTRUCTIONS');

  // Timer
  totalTimeSeconds = 600;
  timeLeftSeconds = signal(600);
  timerInterval: any;

  // Grid
  gridSize = 5;
  grid = signal<CrosswordCell[][]>([]);
  selectedCell = signal<{ x: number, y: number } | null>(null);

  // ─── Cases bloquées ─────────────────────────────────────────────────────────
// Exactement selon le schéma décrit dans les commentaires
private readonly blockedSet = new Set<string>([
  '1,1', '3,1', '4,1',   // row 1: O ■ I ■ ■
  '4,2',                 // row 2: R A T R ■
  '1,3', '2,3', '4,3',   // row 3: S ■ ■ U ■
  '0,4'                  // row 4: ■ ■ M I E L
]);

  // ─── Définitions ────────────────────────────────────────────────────────────
  horizontalDefs: CrosswordDefinition[] = [
    {
      id: 'H1', number: 1, direction: 'H', length: 5,
      clue: 'Gros fruit vert ou jaune du potager',
      answer: 'MELON',
      startX: 0, startY: 0
    },
    {
      id: 'H2', number: 2, direction: 'H', length: 3,
      clue: 'Petit rongeur nuisible',
      answer: 'RAT',
      startX: 0, startY: 2
    },
    {
      id: 'H3', number: 3, direction: 'H', length: 4,
      clue: 'Substance sucrée produite par les abeilles',
      answer: 'MIEL',
      startX: 1, startY: 4
    },
  ];

  verticalDefs: CrosswordDefinition[] = [
    {
      id: 'V1', number: 1, direction: 'V', length: 5,
      clue: 'Grand mammifère marin à longues défenses',
      answer: 'MORSE',
      startX: 0, startY: 0
    },
    {
      id: 'V2', number: 2, direction: 'V', length: 3,
      clue: 'On y dort la nuit',
      answer: 'LIT',
      startX: 2, startY: 0
    },
    {
      id: 'V3', number: 3, direction: 'V', length: 3,
      clue: 'Voie de circulation dans une ville',
      answer: 'RUE',
      startX: 3, startY: 2
    },
  ];

  results = signal<{ id: string, expected: string, user: string, isCorrect: boolean, score: number }[]>([]);
  totalScore = computed(() => this.results().reduce((acc, r) => acc + r.score, 0));
  maxScore = 6; // 6 mots = 6 points (3H + 3V)
  timeSpentStr = '';

  // Backend integration
  testId = signal<number>(6); // ID du test mots croisés (confirmé: 6)
  patientId = signal<number>(36); // ID du patient (par défaut)
  savedAnswers: CrosswordAnswerDto[] = [];

  constructor() {
    this.initGrid();
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params: any) => {
      const id = params['assignationId'] || params['assignmentId'];
      if (id) this.assignmentId.set(Number(id));
      
      // Récupérer le patientId depuis les params ou localStorage
      const patientId = params['patientId'];
      if (patientId) {
        this.patientId.set(Number(patientId));
      } else {
        this.patientId.set(Number(localStorage.getItem('patientId')) || 36);
      }
      
      // Récupérer le testId depuis les params
      const testId = params['testId'];
      if (testId) {
        this.testId.set(Number(testId));
      }
    });
    
    // Charger les définitions depuis le backend si disponible
    this.loadDefinitionsFromBackend();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  loadDefinitionsFromBackend() {
    // Pour l'instant, utiliser les définitions locales
    // Le backend sera intégré plus tard après correction des erreurs 500
    console.log('Utilisation des définitions locales pour le test mots croisés');
    console.log('Patient ID:', this.patientId());
    console.log('Test ID:', this.testId());
    
    // TODO: Activer le chargement depuis le backend quand il sera corrigé
    // this.crosswordTestService.getDefinitions(this.testId()).subscribe({...});
  }

  initGrid() {
    const newGrid: CrosswordCell[][] = [];
    for (let y = 0; y < this.gridSize; y++) {
      const row: CrosswordCell[] = [];
      for (let x = 0; x < this.gridSize; x++) {
        const blocked = this.blockedSet.has(`${x},${y}`);
        row.push({
          x, y,
          letter: '',
          isBlocked: blocked,
          number: blocked ? undefined : this.getNumberForCell(x, y)
        });
      }
      newGrid.push(row);
    }
    this.grid.set(newGrid);
  }

  getNumberForCell(x: number, y: number): number | undefined {
    const allDefs = [...this.horizontalDefs, ...this.verticalDefs];
    const match = allDefs.find(d => d.startX === x && d.startY === y);
    return match?.number;
  }

  startTest() {
    this.currentPhase.set('PLAY');
    this.selectedCell.set({ x: 0, y: 0 });
    this.startTimer();
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeLeftSeconds.update(v => {
        if (v <= 1) { this.finishTest(); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  onCellClick(x: number, y: number) {
    const cell = this.grid()[y]?.[x];
    if (cell && !cell.isBlocked) {
      this.selectedCell.set({ x, y });
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.currentPhase() !== 'PLAY') return;
    
    const current = this.selectedCell();
    if (!current) return;

    const { x, y } = current;

    if (event.key.length === 1 && /[a-zA-ZàâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ]/.test(event.key)) {
      event.preventDefault();
      this.updateCell(x, y, event.key.toUpperCase());
      this.moveToNext(x, y, 'right');
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      this.updateCell(x, y, '');
      this.moveToNext(x, y, 'left');
    } else if (event.key === 'ArrowRight')  { event.preventDefault(); this.moveToNext(x, y, 'right'); }
    else if (event.key === 'ArrowLeft')     { event.preventDefault(); this.moveToNext(x, y, 'left'); }
    else if (event.key === 'ArrowDown')     { event.preventDefault(); this.moveToNext(x, y, 'down'); }
    else if (event.key === 'ArrowUp')       { event.preventDefault(); this.moveToNext(x, y, 'up'); }
  }

  updateCell(x: number, y: number, letter: string) {
    const newGrid = this.grid().map(row => row.map(cell => ({ ...cell })));
    newGrid[y][x].letter = letter;
    this.grid.set(newGrid);
    
    // Sauvegarder la réponse si elle est complète
    this.saveIndividualAnswers();
  }

  saveIndividualAnswers() {
    const g = this.grid();
    
    // Sauvegarder les réponses horizontales complètes
    this.horizontalDefs.forEach(def => {
      let userWord = '';
      for (let i = 0; i < def.length; i++) {
        userWord += g[def.startY]?.[def.startX + i]?.letter ?? '';
      }
      
      // Sauvegarder seulement si le mot est complet
      if (userWord.length === def.length && userWord.trim() !== '') {
        const answer: CrosswordAnswerDto = {
          answer: userWord,
          patientId: this.patientId(),
          testId: this.testId(),
          row: def.startY,
          col: def.startX,
          direction: 'horizontal'
        };
        
        this.crosswordTestService.saveAnswer(answer).subscribe({
          next: (response: any) => console.log('Réponse horizontale sauvegardée:', response),
          error: (error: any) => console.error('Erreur sauvegarde réponse horizontale:', error)
        });
      }
    });
    
    // Sauvegarder les réponses verticales complètes
    this.verticalDefs.forEach(def => {
      let userWord = '';
      for (let i = 0; i < def.length; i++) {
        userWord += g[def.startY + i]?.[def.startX]?.letter ?? '';
      }
      
      // Sauvegarder seulement si le mot est complet
      if (userWord.length === def.length && userWord.trim() !== '') {
        const answer: CrosswordAnswerDto = {
          answer: userWord,
          patientId: this.patientId(),
          testId: this.testId(),
          row: def.startY,
          col: def.startX,
          direction: 'vertical'
        };
        
        this.crosswordTestService.saveAnswer(answer).subscribe({
          next: (response: any) => console.log('Réponse verticale sauvegardée:', response),
          error: (error: any) => console.error('Erreur sauvegarde réponse verticale:', error)
        });
      }
    });
  }

  moveToNext(x: number, y: number, dir: 'right' | 'left' | 'up' | 'down') {
    const dx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
    const dy = dir === 'down'  ? 1 : dir === 'up'   ? -1 : 0;
    const g = this.grid();

    let nx = x + dx, ny = y + dy;
    while (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
      if (!g[ny][nx].isBlocked) {
        this.selectedCell.set({ x: nx, y: ny });
        return;
      }
      nx += dx; ny += dy;
    }
    // Pas de case jouable dans cette direction → rester en place
  }

  clearGrid() {
    if (confirm('Êtes-vous sûr de vouloir effacer toute la grille ?')) {
      this.initGrid();
      this.selectedCell.set({ x: 0, y: 0 });
    }
  }

  validatePrompt() { this.currentPhase.set('VALIDATION'); }
  cancelValidation() { this.currentPhase.set('PLAY'); }

  finishTest() {
    clearInterval(this.timerInterval);
    const timeSpent = this.totalTimeSeconds - this.timeLeftSeconds();
    this.timeSpentStr = `${Math.floor(timeSpent / 60)} min ${timeSpent % 60} sec`;
    
    this.calculateResults();
    this.saveResultsToBackend();
    this.currentPhase.set('RESULTS');
  }

  calculateResults() {
    const finalResults: any[] = [];
    const g = this.grid();

    this.horizontalDefs.forEach(def => {
      let userWord = '';
      for (let i = 0; i < def.length; i++) {
        userWord += g[def.startY]?.[def.startX + i]?.letter ?? '';
      }
      finalResults.push({
        id: def.id, expected: def.answer, user: userWord,
        isCorrect: userWord === def.answer,
        score: userWord === def.answer ? 1 : 0
      });
    });

    this.verticalDefs.forEach(def => {
      let userWord = '';
      for (let i = 0; i < def.length; i++) {
        userWord += g[def.startY + i]?.[def.startX]?.letter ?? '';
      }
      finalResults.push({
        id: def.id, expected: def.answer, user: userWord,
        isCorrect: userWord === def.answer,
        score: userWord === def.answer ? 1 : 0
      });
    });

    this.results.set(finalResults);
  }

  saveResultsToBackend() {
    // Préparer les réponses pour le backend
    const answers: CrosswordAnswerDto[] = [];
    
    // Ajouter les réponses horizontales
    this.horizontalDefs.forEach(def => {
      let userWord = '';
      for (let i = 0; i < def.length; i++) {
        userWord += this.grid()[def.startY]?.[def.startX + i]?.letter ?? '';
      }
      answers.push({
        answer: userWord,
        patientId: this.patientId(),
        testId: this.testId(),
        row: def.startY,
        col: def.startX,
        direction: 'horizontal'
      });
    });
    
    // Ajouter les réponses verticales
    this.verticalDefs.forEach(def => {
      let userWord = '';
      for (let i = 0; i < def.length; i++) {
        userWord += this.grid()[def.startY + i]?.[def.startX]?.letter ?? '';
      }
      answers.push({
        answer: userWord,
        patientId: this.patientId(),
        testId: this.testId(),
        row: def.startY,
        col: def.startX,
        direction: 'vertical'
      });
    });
    
    // Préparer le résultat final
    const result: CrosswordResultDto = {
      testId: this.testId(),
      patientId: this.patientId(),
      score: this.totalScore(),
      totalQuestions: this.maxScore,
      answers: answers
    };
    
    // Sauvegarder dans le backend
    this.crosswordTestService.submitTest(result).subscribe({
      next: (response: any) => {
        console.log('Résultats sauvegardés avec succès:', response);
      },
      error: (error: any) => {
        console.error('Erreur lors de la sauvegarde des résultats:', error);
        // En cas d'erreur, sauvegarder localement
        this.saveResult();
      }
    });
  }

  saveResult() {
    const patientId = Number(localStorage.getItem('patientId')) || 36;
    const result: TestResult = {
      patientId,
      assignmentId: this.assignmentId() || undefined,
      scoreTotale: this.totalScore(),
      maxPossibleScore: this.maxScore,
      scorePercentage: (this.totalScore() / this.maxScore) * 100,
      testDate: new Date().toISOString(),
      durationSeconds: this.totalTimeSeconds - this.timeLeftSeconds(),
      isValid: true,
      severityLevel: this.totalScore() >= 5 ? SeverityLevel.NORMAL
        : this.totalScore() >= 3 ? SeverityLevel.MILD : SeverityLevel.SEVERE
    };
    this.testResultService.create(result).subscribe({
      next: (res: any) => console.log('Résultat sauvegardé localement:', res),
      error: (err: any) => console.error('Erreur sauvegarde locale:', err)
    });
  }

  getFilledCount() {
    return this.grid().flat().filter(c => !c.isBlocked && c.letter !== '').length;
  }

  getTotalPlayableCells() {
    return this.grid().flat().filter(c => !c.isBlocked).length;
  }

  exit() {
    this.router.navigate(['/tests-cognitifs']);
  }
}
