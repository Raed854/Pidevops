import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface PuzzlePiece {
  id: number;
  label: string;
  emoji: string;
  color: string;
  correctPosition: number;
  currentPosition: number | null;
}

@Component({
  selector: 'app-test-puzzles-simples',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-puzzles-simples.component.html',
  styleUrls: ['./test-puzzles-simples.component.css']
})
export class TestPuzzlesSimplesComponent implements OnInit, OnDestroy {
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);
  private http        = inject(HttpClient);
  private apiUrl      = environment.apiUrl;
  private timerInterval: any;

  patientName    = signal('Patient');
  patientId      = signal<number>(0);
  assignationId  = signal<number | null>(null);
  elapsedSeconds = signal(0);
  isComplete     = signal(false);
  finalScore     = signal(0);        // accumulé puzzle par puzzle
  draggedPieceId = signal<number | null>(null);
  activeStep     = signal(0);

  // Score accumulé sur les puzzles terminés (hors puzzle courant)
  private accumulatedScore = 0;

  puzzles = [
    {
      id: 1, title: 'Puzzle Animaux', description: 'Placez chaque partie dans la bonne position',
      pieces: [
        { id: 1,  label: 'Tête',    emoji: '🐶', color: '#FFE8A3', correctPosition: 0, currentPosition: null as number | null },
        { id: 2,  label: 'Corps',   emoji: '🦴', color: '#B7F5C2', correctPosition: 1, currentPosition: null as number | null },
        { id: 3,  label: 'Pattes',  emoji: '🐾', color: '#BAD5FF', correctPosition: 2, currentPosition: null as number | null },
        { id: 4,  label: 'Queue',   emoji: '〰️', color: '#FFB3B3', correctPosition: 3, currentPosition: null as number | null },
      ]
    },
    {
      id: 2, title: 'Puzzle Maison', description: 'Construisez la maison dans le bon ordre',
      pieces: [
        { id: 5,  label: 'Toit',    emoji: '🏠', color: '#FFB3B3', correctPosition: 0, currentPosition: null as number | null },
        { id: 6,  label: 'Murs',    emoji: '🧱', color: '#FFE8A3', correctPosition: 1, currentPosition: null as number | null },
        { id: 7,  label: 'Porte',   emoji: '🚪', color: '#BAD5FF', correctPosition: 2, currentPosition: null as number | null },
        { id: 8,  label: 'Fenêtre', emoji: '🪟', color: '#B7F5C2', correctPosition: 3, currentPosition: null as number | null },
      ]
    },
    {
      id: 3, title: 'Puzzle Visage', description: 'Reconstituez le visage dans l\'ordre',
      pieces: [
        { id: 9,  label: 'Yeux',    emoji: '👀', color: '#BAD5FF', correctPosition: 0, currentPosition: null as number | null },
        { id: 10, label: 'Nez',     emoji: '👃', color: '#FFE8A3', correctPosition: 1, currentPosition: null as number | null },
        { id: 11, label: 'Bouche',  emoji: '👄', color: '#FFB3B3', correctPosition: 2, currentPosition: null as number | null },
        { id: 12, label: 'Oreilles',emoji: '👂', color: '#B7F5C2', correctPosition: 3, currentPosition: null as number | null },
      ]
    },
    {
      id: 4, title: 'Puzzle Saisons', description: 'Ordonnez les saisons dans le bon ordre',
      pieces: [
        { id: 13, label: 'Printemps', emoji: '🌸', color: '#FFE8A3', correctPosition: 0, currentPosition: null as number | null },
        { id: 14, label: 'Été',       emoji: '☀️', color: '#FFB3B3', correctPosition: 1, currentPosition: null as number | null },
        { id: 15, label: 'Automne',   emoji: '🍂', color: '#BAD5FF', correctPosition: 2, currentPosition: null as number | null },
        { id: 16, label: 'Hiver',     emoji: '❄️', color: '#B7F5C2', correctPosition: 3, currentPosition: null as number | null },
      ]
    }
  ];

  currentPuzzle  = computed(() => this.puzzles[this.activeStep()]);
  totalPuzzles   = 4;

  dropZones: (number | null)[] = [null, null, null, null];

  // Nombre de pièces correctes dans le puzzle courant (réactif pour la vue)
  correctCount = computed(() => {
    // On force la réévaluation en lisant activeStep()
    this.activeStep();
    return this.dropZones.filter((_, idx) => this.isZoneCorrect(idx)).length;
  });

  // Progression = pièces correctes du puzzle courant / total pièces
  progressPercentage = computed(() => {
    const correct = this.dropZones.filter((_, idx) => this.isZoneCorrect(idx)).length;
    return Math.round((correct / this.currentPuzzle().pieces.length) * 100);
  });

  formattedTime = computed(() => {
    const m = Math.floor(this.elapsedSeconds() / 60);
    const s = this.elapsedSeconds() % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  // ── Lifecycle ──────────────────────────────────────

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['patientId'])     this.patientId.set(+params['patientId']);
      if (params['assignationId']) this.assignationId.set(+params['assignationId']);
      this.loadPatientInfo();
    });
    this.startTimer();
    this.resetDropZones();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
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
          const nom    = a.patientNom    || a.patient?.nom    || '';
          const prenom = a.patientPrenom || a.patient?.prenom || '';
          this.patientName.set(`${prenom} ${nom}`.trim() || 'Patient');
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

  // ── Helpers ────────────────────────────────────────

  resetDropZones() {
    this.dropZones = [null, null, null, null];
  }

  getAvailablePieces() {
    const placed = this.dropZones.filter(z => z !== null) as number[];
    return this.currentPuzzle().pieces.filter(p => !placed.includes(p.id));
  }

  getDropZonePiece(zoneIdx: number) {
    const pieceId = this.dropZones[zoneIdx];
    if (pieceId === null) return null;
    return this.currentPuzzle().pieces.find(p => p.id === pieceId) ?? null;
  }

  /** Retourne le label de la pièce attendue à cette position */
  getExpectedPieceLabel(zoneIdx: number): string {
    const expected = this.currentPuzzle().pieces.find(p => p.correctPosition === zoneIdx);
    return expected?.label ?? `Position ${zoneIdx + 1}`;
  }

  /** ✅ Correct seulement si la pièce a correctPosition === zoneIdx */
  isZoneCorrect(zoneIdx: number): boolean {
    const pieceId = this.dropZones[zoneIdx];
    if (pieceId === null) return false;
    const piece = this.currentPuzzle().pieces.find(p => p.id === pieceId);
    return piece?.correctPosition === zoneIdx;
  }

  // ── Drag & Drop ────────────────────────────────────

  onDragStart(pieceId: number)  { this.draggedPieceId.set(pieceId); }
  onDragOver(event: DragEvent)  { event.preventDefault(); }

  onDropOnZone(event: DragEvent, zoneIdx: number) {
    event.preventDefault();
    const pieceId = this.draggedPieceId();
    if (pieceId === null) return;

    // Retirer la pièce de son ancienne zone
    this.dropZones = this.dropZones.map(z => z === pieceId ? null : z);
    // Placer dans la nouvelle zone (déplace l'ancienne pièce au pool)
    this.dropZones[zoneIdx] = pieceId;
    this.draggedPieceId.set(null);
  }

  onDropOnPool(event: DragEvent) {
    event.preventDefault();
    const pieceId = this.draggedPieceId();
    if (pieceId !== null) {
      this.dropZones = this.dropZones.map(z => z === pieceId ? null : z);
    }
    this.draggedPieceId.set(null);
  }

  // ── Navigation ─────────────────────────────────────

  goPrevPuzzle() {
    if (this.activeStep() > 0) {
      this.activeStep.update(s => s - 1);
      this.resetDropZones();
    }
  }

  goNextPuzzle() {
    // ✅ Compter les pièces correctement placées sur CE puzzle avant de passer au suivant
    const puzzleScore = this.dropZones.filter((_, idx) => this.isZoneCorrect(idx)).length;
    this.accumulatedScore += puzzleScore;

    if (this.activeStep() < this.totalPuzzles - 1) {
      this.activeStep.update(s => s + 1);
      this.resetDropZones();
    } else {
      this.finishTest();
    }
  }

  private finishTest() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    // Le score est déjà totalisé dans accumulatedScore par goNextPuzzle()
    this.finalScore.set(this.accumulatedScore);
    this.isComplete.set(true);
    this.saveResults();
  }

  private saveResults() {
    const payload = {
      patientId:       this.patientId(),
      testId:          17,
      assignationId:   this.assignationId(),
      score:           this.finalScore(),
      durationSeconds: this.elapsedSeconds()
    };
    this.http.post(`${this.apiUrl}/tests/17/results`, payload).subscribe({ error: () => {} });
  }

  returnToDashboard() { this.router.navigate(['/tests-cognitifs']); }
}