import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { DisponibiliteService, DisponibiliteResponse } from '../services/disponibilite.service';
import { TraitementService } from '../services/traitement.service';

export type Statut = 'libre' | 'réservé';

export interface Disponibilite {
  id: number;
  date: string;       // YYYY-MM-DD
  heureDebut: string; // HH:MM
  heureFin: string;   // HH:MM
  statut: Statut;
  patientId?: number;
  patientNom?: string;
  patientPrenom?: string;
}

export interface Patient {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
}

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

@Component({
  selector: 'app-disponibilite-accompagnant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './disponibilite-accompagnant.component.html',
  styleUrl: './disponibilite-accompagnant.component.css'
})
export class DisponibiliteAccompagnantComponent implements OnInit {

  readonly weekDays = WEEK_DAYS;

  // ── Connected user ────────────────────────────
  private userId!: number;

  // ── Calendar ──────────────────────────────────
  today = new Date();
  calendarDate = new Date();
  selectedDate: string | null = null;

  // ── Data ─────────────────────────────────────
  disponibilites: Disponibilite[] = [];
  isLoading = false;
  errorMessage = '';

  patients: Patient[] = [];

  // ── Form ─────────────────────────────────────
  form!: FormGroup;
  formSubmitted = false;
  isSubmitting = false;
  showModal = false;
  editingId: number | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly disponibiliteService: DisponibiliteService,
    private readonly traitementService: TraitementService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.userId = Number(user.id); // guard against string from localStorage
    this.initForm();
    this.loadDisponibilites();
    this.loadPatients();
  }

  // ══════════════════════════════════════════════
  // API
  // ══════════════════════════════════════════════

  private loadDisponibilites(): void {
    this.isLoading = true;
    this.disponibiliteService.getByUser(this.userId).subscribe({
      next: (data) => {
        this.disponibilites = data.map(d => this.fromResponse(d));
        this.isLoading = false;
      },
      error: () => {
        // API might not yet support GET — start empty
        this.isLoading = false;
      }
    });
  }

  private loadPatients(): void {
    this.traitementService.getPatientNamesByAccompagnant(this.userId).subscribe({
      next: (data) => this.patients = data,
      error: (err) => console.error('[Disponibilite] failed to load patients', err)
    });
  }

  private buildPayload(v: ReturnType<FormGroup['getRawValue']>) {
    const payload = {
      date:       v['date'],
      heureDebut: this.toTimeWithSeconds(v['heureDebut']),
      heureFin:   this.toTimeWithSeconds(v['heureFin']),
      statut:     (v['statut'] === 'réservé' ? 'RESERVE' : 'LIBRE') as 'LIBRE' | 'RESERVE',
      userId:     this.userId
    };
    console.log('[Disponibilite] payload →', JSON.stringify(payload, null, 2));
    return payload;
  }

  /** Normalises time to HH:MM:SS regardless of browser input format */
  private toTimeWithSeconds(time: string): string {
    if (!time) return '00:00:00';
    const parts = time.split(':');
    const hh = parts[0]?.padStart(2, '0') ?? '00';
    const mm = parts[1]?.padStart(2, '0') ?? '00';
    const ss = parts[2]?.padStart(2, '0') ?? '00';
    return `${hh}:${mm}:${ss}`;
  }

  /** Maps API response back to the component's internal model */
  private fromResponse(d: DisponibiliteResponse): Disponibilite {
    return {
      id:            d.id,
      date:          d.date,
      heureDebut:    d.heureDebut.substring(0, 5), // strip seconds for display
      heureFin:      d.heureFin.substring(0, 5),
      statut:        d.statut === 'RESERVE' ? 'réservé' : 'libre',
      patientId:     d.patient?.id,
      patientPrenom: d.patient?.prenom,
      patientNom:    d.patient?.nom,
    };
  }

  // ══════════════════════════════════════════════
  // Calendar helpers
  // ══════════════════════════════════════════════

  get calendarYear(): number  { return this.calendarDate.getFullYear(); }
  get calendarMonth(): number { return this.calendarDate.getMonth(); }

  get calendarMonthLabel(): string {
    return this.calendarDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  get calendarDays(): (number | null)[] {
    const firstDay = new Date(this.calendarYear, this.calendarMonth, 1).getDay();
    const daysInMonth = new Date(this.calendarYear, this.calendarMonth + 1, 0).getDate();
    const offset = (firstDay + 6) % 7;
    const days: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }

  prevMonth(): void {
    this.calendarDate = new Date(this.calendarYear, this.calendarMonth - 1, 1);
  }

  nextMonth(): void {
    this.calendarDate = new Date(this.calendarYear, this.calendarMonth + 1, 1);
  }

  private toDateString(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  selectDay(day: number | null): void {
    if (!day) return;
    this.selectedDate = this.toDateString(this.calendarYear, this.calendarMonth, day);
    this.openModal();
  }

  hasDisponibilite(day: number | null): boolean {
    if (!day) return false;
    const d = this.toDateString(this.calendarYear, this.calendarMonth, day);
    return this.disponibilites.some(x => x.date === d);
  }

  isToday(day: number | null): boolean {
    if (!day) return false;
    const todayStr = this.toDateString(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return this.toDateString(this.calendarYear, this.calendarMonth, day) === todayStr;
  }

  isSelected(day: number | null): boolean {
    if (!day) return false;
    return this.toDateString(this.calendarYear, this.calendarMonth, day) === this.selectedDate;
  }

  // ══════════════════════════════════════════════
  // Form
  // ══════════════════════════════════════════════

  private initForm(date = ''): void {
    this.form = this.fb.group({
      date:       [date,    Validators.required],
      heureDebut: ['08:00', Validators.required],
      heureFin:   ['17:00', Validators.required],
      statut:     ['libre' as Statut, Validators.required],
      patientId:  [null as number | null],
    });

    this.form.get('statut')!.valueChanges.subscribe((val: Statut) => {
      const ctrl = this.form.get('patientId')!;
      if (val === 'réservé') {
        ctrl.setValidators(Validators.required);
      } else {
        ctrl.clearValidators();
        ctrl.setValue(null);
      }
      ctrl.updateValueAndValidity();
    });

    // Auto-switch to "réservé" when a patient is selected
    this.form.get('patientId')!.valueChanges.subscribe((patientId: number | null) => {
      const statutCtrl = this.form.get('statut')!;
      if (patientId) {
        if (statutCtrl.value !== 'réservé') {
          statutCtrl.setValue('réservé', { emitEvent: false });
          // Ensure patientId validator is set
          const pCtrl = this.form.get('patientId')!;
          pCtrl.setValidators(Validators.required);
          pCtrl.updateValueAndValidity({ emitEvent: false });
        }
      }
    });
  }

  get statutValue(): Statut {
    return this.form.get('statut')!.value as Statut;
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.formSubmitted);
  }

  openModal(dispo?: Disponibilite): void {
    this.formSubmitted = false;
    this.errorMessage = '';
    if (dispo) {
      this.editingId = dispo.id;
      this.initForm(dispo.date);
      this.form.patchValue({
        heureDebut: dispo.heureDebut,
        heureFin:   dispo.heureFin,
        statut:     dispo.statut,
        patientId:  dispo.patientId ?? null,
      });
      this.selectedDate = dispo.date;
    } else {
      this.editingId = null;
      this.initForm(this.selectedDate ?? '');
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formSubmitted = false;
    this.errorMessage = '';
  }

  submitForm(): void {
    this.formSubmitted = true;
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const payload = this.buildPayload(v);

    this.isSubmitting = true;
    this.errorMessage = '';

    if (this.editingId !== null) {
      this.disponibiliteService.update(this.editingId, payload).subscribe({
        next: (res) => {
          const idx = this.disponibilites.findIndex(d => d.id === this.editingId);
          if (idx > -1) this.disponibilites[idx] = this.fromResponse(res);
          this.isSubmitting = false;
          this.closeModal();
        },
        error: (err) => {
          console.error('[Disponibilite] update error', err);
          this.errorMessage = this.extractError(err);
          this.isSubmitting = false;
        }
      });
    } else {
      this.disponibiliteService.create(payload).subscribe({
        next: (res) => {
          this.disponibilites.push(this.fromResponse(res));
          this.isSubmitting = false;
          this.closeModal();
        },
        error: (err) => {
          console.error('[Disponibilite] create error body:', JSON.stringify(err?.error, null, 2));
          this.errorMessage = this.extractError(err);
          this.isSubmitting = false;
        }
      });
    }
  }

  deleteDisponibilite(id: number): void {
    this.disponibiliteService.delete(id).subscribe({
      next: () => {
        this.disponibilites = this.disponibilites.filter(d => d.id !== id);
      },
      error: () => {
        this.errorMessage = 'Erreur lors de la suppression.';
      }
    });
  }

  // ══════════════════════════════════════════════
  // Computed helpers
  // ══════════════════════════════════════════════

  private extractError(err: any): string {
    const body = err?.error;
    if (typeof body === 'string' && body.length) return body;
    // Spring Boot field validation errors
    if (Array.isArray(body?.errors) && body.errors.length) {
      return body.errors.map((e: any) => e.defaultMessage ?? e.message ?? e).join(' | ');
    }
    if (body?.message) return body.message;
    if (body?.error) return `${body.error}${body.path ? ' — ' + body.path : ''}`;
    return `Erreur ${err?.status ?? ''} — Veuillez réessayer.`;
  }

  heuresTravaillees(d: Disponibilite): string {
    const [dh, dm] = d.heureDebut.split(':').map(Number);
    const [fh, fm] = d.heureFin.split(':').map(Number);
    const totalMins = (fh * 60 + fm) - (dh * 60 + dm);
    if (totalMins <= 0) return '—';
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  }

  getPatientName(id?: number): string {
    if (!id) return '—';
    const p = this.patients.find(p => p.id === id);
    return p ? `${p.prenom} ${p.nom}` : '—';
  }

  get sortedDisponibilites(): Disponibilite[] {
    return [...this.disponibilites].sort(
      (a, b) => a.date.localeCompare(b.date) || a.heureDebut.localeCompare(b.heureDebut)
    );
  }

  get libreCount():  number { return this.disponibilites.filter(d => d.statut === 'libre').length; }
  get reserveCount(): number { return this.disponibilites.filter(d => d.statut === 'réservé').length; }
}
