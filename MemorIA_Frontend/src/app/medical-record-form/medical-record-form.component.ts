import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { MedicalRecordService } from '../services/medical-record.service';
import { DossierMedical } from '../models/medical-record.model';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-medical-record-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    ToastModule, ButtonModule, InputTextModule, DropdownModule, InputTextareaModule, CardModule, DividerModule
  ],
  providers: [MessageService],
  templateUrl: './medical-record-form.component.html',
  styleUrl: './medical-record-form.component.css'
})
export class MedicalRecordFormComponent implements OnInit {
  isSubmitting = false;
  isEditMode = false;
  dossierId: number | null = null;
  patientIdFromRoute: number | null = null;

  private currentUser: any = null;
  private readonly fb = inject(FormBuilder);

  stadeOptions = [
    { label: 'Léger', value: 'LEGER' },
    { label: 'Modéré', value: 'MODERE' },
    { label: 'Sévère', value: 'SEVERE' }
  ];

  orientationOptions = [
    { label: 'Conscient / Orienté', value: 'CONSCIENT' },
    { label: 'Confus / Désorienté', value: 'CONFUS' }
  ];

  fonctionnementOptions = [
    { label: 'Indépendant', value: 'INDEPENDANT' },
    { label: 'Besoin d\'aide', value: 'BESOIN_AIDE' },
    { label: 'Dépendant', value: 'DEPENDANT' }
  ];

  comportementOptions = [
    { label: 'Calme', value: 'CALME' },
    { label: 'Anxieux', value: 'ANXIEUX' },
    { label: 'Agressif', value: 'AGRESSIF' },
    { label: 'Tendance à la fugue', value: 'FUGUE' }
  ];

  form = this.fb.nonNullable.group({
    // 1. Basic Info
    contactPatient: [''],
    // 2. Diagnosis
    typeDiagnostic: ['', [Validators.required]],
    stade: ['' as string],
    dateDiagnostic: [''],
    // 3. Health & History
    maladiesPrincipales: [''],
    allergies: [''],
    // 4. Cognitive State
    niveauMemoire: [''],
    orientation: ['' as string],
    // 5. Daily Function
    niveauFonctionnement: ['' as string],
    // 6. Medications
    medicamentsActuels: [''],
    // 7. Behavior
    etatComportement: ['' as string],
    // 8. Caregiver
    accompagnantNom: [''],
    accompagnantContact: [''],
    // 9. Notes
    notesMedecin: [''],
    derniereVisite: ['']
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const role = this.currentUser.role?.toUpperCase();
    if (role !== 'ADMINISTRATEUR' && role !== 'SOIGNANT' && role !== 'PATIENT') {
      this.router.navigate(['/dossier-medical']);
      return;
    }

    this.dossierId = this.route.snapshot.paramMap.get('id')
      ? +this.route.snapshot.paramMap.get('id')!
      : null;
    this.patientIdFromRoute = this.route.snapshot.queryParamMap.get('patientId')
      ? +this.route.snapshot.queryParamMap.get('patientId')!
      : null;

    // Patients can only create/edit their own record
    if (role === 'PATIENT') {
      this.patientIdFromRoute = this.currentUser.id;
    }

    this.isEditMode = !!this.dossierId;

    if (this.isEditMode && this.dossierId) {
      this.loadExisting(this.dossierId);
    }
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Modifier le dossier médical' : 'Nouveau dossier médical';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const raw = this.form.getRawValue();

    const payload: DossierMedical = {
      patient: { id: this.patientIdFromRoute ?? 0 },
      contactPatient: raw.contactPatient || undefined,
      typeDiagnostic: raw.typeDiagnostic || undefined,
      stade: (raw.stade || undefined) as any,
      dateDiagnostic: raw.dateDiagnostic || undefined,
      maladiesPrincipales: raw.maladiesPrincipales || undefined,
      allergies: raw.allergies || undefined,
      niveauMemoire: raw.niveauMemoire || undefined,
      orientation: (raw.orientation || undefined) as any,
      niveauFonctionnement: (raw.niveauFonctionnement || undefined) as any,
      medicamentsActuels: raw.medicamentsActuels || undefined,
      etatComportement: (raw.etatComportement || undefined) as any,
      accompagnantNom: raw.accompagnantNom || undefined,
      accompagnantContact: raw.accompagnantContact || undefined,
      notesMedecin: raw.notesMedecin || undefined,
      derniereVisite: raw.derniereVisite || undefined
    };

    const obs = this.isEditMode && this.dossierId
      ? this.medicalRecordService.update(this.dossierId, payload, this.currentUser.id)
      : this.medicalRecordService.create(payload, this.currentUser.id);

    obs.subscribe({
      next: (saved) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Enregistré',
          detail: 'Dossier médical sauvegardé avec succès.'
        });
        this.isSubmitting = false;
        const patId = saved.patient?.id ?? this.patientIdFromRoute;
        setTimeout(() => this.router.navigate(['/dossier-medical/patient', patId]), 1200);
      },
      error: (err) => {
        this.isSubmitting = false;

        // 409 Conflict: un dossier existe déjà pour ce patient — rediriger vers celui-ci.
        if (err.status === 409) {
          this.messageService.add({
            severity: 'info',
            summary: 'Dossier déjà existant',
            detail: 'Un dossier médical existe déjà pour ce patient. Redirection en cours…'
          });
          const patId = this.patientIdFromRoute ?? this.currentUser.id;
          setTimeout(() => this.router.navigate(['/dossier-medical/patient', patId]), 1200);
          return;
        }

        const detail = err.error?.message ?? 'Impossible de sauvegarder le dossier médical.';
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail });
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/dossier-medical']);
  }

  private loadExisting(id: number): void {
    this.medicalRecordService.getById(id, this.currentUser.id).subscribe({
      next: (d) => {
        this.patientIdFromRoute = d.patient?.id ?? null;
        this.form.patchValue({
          contactPatient: d.contactPatient ?? '',
          typeDiagnostic: d.typeDiagnostic ?? '',
          stade: d.stade ?? '',
          dateDiagnostic: d.dateDiagnostic ?? '',
          maladiesPrincipales: d.maladiesPrincipales ?? '',
          allergies: d.allergies ?? '',
          niveauMemoire: d.niveauMemoire ?? '',
          orientation: d.orientation ?? '',
          niveauFonctionnement: d.niveauFonctionnement ?? '',
          medicamentsActuels: d.medicamentsActuels ?? '',
          etatComportement: d.etatComportement ?? '',
          accompagnantNom: d.accompagnantNom ?? '',
          accompagnantContact: d.accompagnantContact ?? '',
          notesMedecin: d.notesMedecin ?? '',
          derniereVisite: d.derniereVisite ?? ''
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Dossier médical introuvable.' });
        this.router.navigate(['/dossier-medical']);
      }
    });
  }
}
