import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, of, Subscription, interval } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { UserService, UserResponse } from '../services/user.service';
import { AuthService } from '../auth/auth.service';
import { TraitementService, TraitementDisplay, AffectationResponse } from '../services/traitement.service';
import { AlertPatientService, AlertPatientResponse } from '../services/alert-patient.service';

@Component({
  selector: 'app-traitement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './traitement.component.html',
  styleUrl: './traitement.component.css'
})
export class TraitementComponent implements OnInit, OnDestroy {

  showModal = false;
  form!: FormGroup;
  formSubmitted = false;

  patients: UserResponse[] = [];
  accompagnantsLibres: UserResponse[] = [];
  traitements: TraitementDisplay[] = [];

  selectedPatientId: number | null = null;
  selectedAccompagnantId: number | null = null;

  loading = false;
  submitLoading = false;
  errorMsg = '';
  successMsg = '';

  // ── Alerts (real-time polling) ────────────────────
  alerts: AlertPatientResponse[] = [];
  alertReadFilter: 'all' | 'unread' | 'read' = 'all';
  private alertPollSub?: Subscription;
  private readonly POLL_INTERVAL = 30_000; // 30s

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly traitementService: TraitementService,
    private readonly alertService: AlertPatientService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.loadAlerts();
    this.startAlertPolling();
  }

  ngOnDestroy(): void {
    this.alertPollSub?.unsubscribe();
  }

  private initForm(): void {
    this.form = this.fb.group({
      titre:              ['', [Validators.required, Validators.minLength(3)]],
      alerteActive:       [false],
      typeAlerte:         [''],
      notes:              [''],
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.formSubmitted);
  }

  // ── Data loading ──────────────────────────────────
  loadData(): void {
    this.loading = true;
    this.errorMsg = '';

    forkJoin({
      patients:      this.userService.getByRole('PATIENT').pipe(catchError(() => of<UserResponse[]>([]))),
      accompagnants: this.userService.getAccompagnantsLibres().pipe(catchError(() => of<UserResponse[]>([]))),
    }).subscribe({
      next: ({ patients, accompagnants }) => {
        this.patients = patients;
        this.accompagnantsLibres = accompagnants;
        this.loadTraitementDisplays(patients, accompagnants);
      },
      error: () => {
        this.errorMsg = 'Erreur lors du chargement des données.';
        this.loading = false;
      }
    });
  }

  private loadTraitementDisplays(patients: UserResponse[], accompagnants: UserResponse[]): void {
    const patientCalls = patients.map(p =>
      this.traitementService.getByPatient(p.id).pipe(catchError(() => of<AffectationResponse[]>([])))
    );
    const accCalls = accompagnants.map(a =>
      this.traitementService.getByAccompagnant(a.id).pipe(catchError(() => of<AffectationResponse[]>([])))
    );

    forkJoin({
      patientResults: patientCalls.length ? forkJoin(patientCalls) : of([]),
      accResults:     accCalls.length     ? forkJoin(accCalls)     : of([]),
    }).subscribe({
      next: ({ patientResults, accResults }) => {
        const treatmentPatient = new Map<number, string>();
        const treatmentInfo = new Map<number, {
          idAffectation: number; titre: string; alerteActive: boolean;
          typeAlerte: string; dateCreation: string; statut: string;
          dosage: string; frequence: string; voieAdministration: string;
          dateFinPrevue: string; notes: string;
        }>();

        (patientResults as AffectationResponse[][]).forEach((affectations, i) => {
          const patient = patients[i];
          affectations.forEach(aff => {
            const tid = aff.traitements?.idTraitement;
            if (tid != null) {
              treatmentPatient.set(tid, `${patient.prenom} ${patient.nom}`);
              treatmentInfo.set(tid, {
                idAffectation:      aff.idAffectation,
                titre:              aff.traitements?.titre ?? '',
                alerteActive:       aff.traitements?.alerteActive ?? false,
                typeAlerte:         aff.traitements?.typeAlerte ?? '',
                dateCreation:       aff.traitements?.dateCreation ?? '',
                statut:             aff.statut ?? '',
                dosage:             aff.dosage ?? '',
                frequence:          aff.frequence ?? '',
                voieAdministration: aff.voieAdministration ?? '',
                dateFinPrevue:      aff.dateFinPrevue ?? '',
                notes:              aff.notes ?? '',
              });
            }
          });
        });

        const treatmentAcc = new Map<number, string>();
        (accResults as AffectationResponse[][]).forEach((affectations, i) => {
          const acc = accompagnants[i];
          affectations.forEach(aff => {
            const tid = aff.traitements?.idTraitement;
            if (tid != null) {
              treatmentAcc.set(tid, `${acc.prenom} ${acc.nom}`);
            }
          });
        });

        this.traitements = [];
        treatmentInfo.forEach((info, tid) => {
          this.traitements.push({
            idAffectation:      info.idAffectation,
            idTraitement:       tid,
            titre:              info.titre,
            alerteActive:       info.alerteActive,
            typeAlerte:         info.typeAlerte,
            dateCreation:       info.dateCreation,
            patientNom:         treatmentPatient.get(tid) ?? '—',
            accompagnantNom:    treatmentAcc.get(tid) ?? '—',
            statut:             info.statut,
            dosage:             info.dosage,
            frequence:          info.frequence,
            voieAdministration: info.voieAdministration,
            dateFinPrevue:      info.dateFinPrevue,
            notes:              info.notes,
          });
        });

        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Erreur lors du chargement des traitements.';
        this.loading = false;
      }
    });
  }

  // ── Alerts — real data + polling ──────────────────
  loadAlerts(): void {
    this.alertService.getAll().pipe(
      catchError(() => of<AlertPatientResponse[]>([]))
    ).subscribe(alerts => this.alerts = alerts);
  }

  private startAlertPolling(): void {
    this.alertPollSub = interval(this.POLL_INTERVAL).pipe(
      switchMap(() => this.alertService.getAll().pipe(catchError(() => of<AlertPatientResponse[]>([]))))
    ).subscribe(alerts => this.alerts = alerts);
  }

  get filteredAlerts(): AlertPatientResponse[] {
    return this.alerts.filter(a => {
      if (this.alertReadFilter === 'unread') return !a.lu;
      if (this.alertReadFilter === 'read')   return a.lu;
      return true;
    });
  }

  get alertCounts(): Record<string, number> {
    return {
      all:    this.alerts.length,
      unread: this.alerts.filter(a => !a.lu).length,
      read:   this.alerts.filter(a => a.lu).length,
    };
  }

  markAsRead(alert: AlertPatientResponse): void {
    if (alert.lu) return;
    this.alertService.markAsRead(alert.idAlerte).subscribe({
      next: (updated) => {
        const idx = this.alerts.findIndex(a => a.idAlerte === updated.idAlerte);
        if (idx >= 0) this.alerts[idx] = updated;
      }
    });
  }

  // ── Modal ─────────────────────────────────────────
  openModal(): void {
    this.formSubmitted = false;
    this.selectedPatientId = null;
    this.selectedAccompagnantId = null;
    this.errorMsg = '';
    this.successMsg = '';
    this.initForm();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.errorMsg = '';
  }

  selectPatient(id: number): void {
    this.selectedPatientId = this.selectedPatientId === id ? null : id;
  }

  selectAccompagnant(id: number): void {
    this.selectedAccompagnantId = this.selectedAccompagnantId === id ? null : id;
  }

  // ── Submit ────────────────────────────────────────
  submitForm(): void {
    this.formSubmitted = true;
    if (this.form.invalid) return;
    if (!this.selectedPatientId || !this.selectedAccompagnantId) {
      this.errorMsg = 'Veuillez sélectionner un patient et un accompagnant.';
      return;
    }

    this.submitLoading = true;
    this.errorMsg = '';

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.errorMsg = 'Utilisateur non connecté.';
      this.submitLoading = false;
      return;
    }

    const { titre, alerteActive, typeAlerte, dosage, frequence, voieAdministration, dateFinPrevue, instructions, notes } = this.form.value;

    this.traitementService.create({
      idUser:              currentUser.id,
      titre,
      alerteActive,
      typeAlerte:          typeAlerte || undefined,
      patientId:           this.selectedPatientId,
      accompagnantId:      this.selectedAccompagnantId,
      dosage,
      frequence,
      voieAdministration,
      dateFinPrevue:       dateFinPrevue ? `${dateFinPrevue}T00:00:00` : undefined,
      instructions:        instructions || undefined,
      notes:               notes || undefined,
    }).subscribe({
      next: () => {
        this.submitLoading = false;
        this.closeModal();
        this.successMsg = 'Traitement créé et accompagnant affecté avec succès.';
        this.loadData();
      },
      error: (err) => {
        console.error('Erreur création traitement', err);
        this.errorMsg = 'Erreur lors de la création du traitement.';
        this.submitLoading = false;
      }
    });
  }

  // ── Affectation actions ────────────────────────────
  finishAffectation(t: TraitementDisplay): void {
    this.traitementService.updateAffectationStatus(t.idAffectation, 'TERMINE').subscribe({
      next: () => {
        this.successMsg = `Traitement « ${t.titre} » terminé. Les disponibilités de l'accompagnant sont libérées.`;
        this.loadData();
      },
      error: () => {
        this.errorMsg = 'Erreur lors de la mise à jour du statut.';
      }
    });
  }

  cancelAffectation(t: TraitementDisplay): void {
    this.traitementService.updateAffectationStatus(t.idAffectation, 'ANNULE').subscribe({
      next: () => {
        this.successMsg = `Traitement « ${t.titre} » annulé. Les disponibilités de l'accompagnant sont libérées.`;
        this.loadData();
      },
      error: () => {
        this.errorMsg = 'Erreur lors de l\'annulation.';
      }
    });
  }

  deleteAffectation(t: TraitementDisplay): void {
    this.traitementService.deleteAffectation(t.idAffectation).subscribe({
      next: () => {
        this.successMsg = `Affectation supprimée. Les disponibilités de l'accompagnant sont libérées.`;
        this.loadData();
      },
      error: () => {
        this.errorMsg = 'Erreur lors de la suppression de l\'affectation.';
      }
    });
  }

  // ── Computed counts ────────────────────────────────
  get enCoursCount(): number { return this.traitements.filter(t => t.statut === 'EN_COURS').length; }
  get termineCount(): number { return this.traitements.filter(t => t.statut === 'TERMINE').length; }
  get annuleCount():  number { return this.traitements.filter(t => t.statut === 'ANNULE').length; }

  // ── Helpers ───────────────────────────────────────
  getPatientName(id: number): string {
    const p = this.patients.find(u => u.id === id);
    return p ? `${p.prenom} ${p.nom}` : `Patient #${id}`;
  }

  getAccompagnantName(id: number): string {
    const a = this.accompagnantsLibres.find(u => u.id === id);
    return a ? `${a.prenom} ${a.nom}` : `Accompagnant #${id}`;
  }

  getTraitementTitre(idTraitement: number): string {
    const t = this.traitements.find(t => t.idTraitement === idTraitement);
    return t?.titre ?? `Traitement #${idTraitement}`;
  }
}
