import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AccompagnantService } from '../services/accompagnant.service';
import { AccompagnantSignupData } from '../models/signup.model';

@Component({
  selector: 'app-profile-accompagnant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-accompagnant.component.html',
  styleUrl: './profile-accompagnant.component.css'
})
export class ProfileAccompagnantComponent {
  isSubmitting = false;
  private readonly fb = inject(FormBuilder);
  private currentUser: any = null;

  lienOptions = [
    { label: 'Lien familial', value: 'familial' },
    { label: 'Lien professionnel', value: 'professionnel' }
  ];

  situationProOptions = [
    { label: 'Non précisé', value: '' },
    { label: 'Salarié(e)', value: 'salarie' },
    { label: 'Retraité(e)', value: 'retraite' },
    { label: 'Sans activité', value: 'sans_activite' }
  ];

  frequenceOptions = [
    { label: 'Quotidien', value: 'quotidien' },
    { label: 'Hebdomadaire', value: 'hebdo' },
    { label: 'Mensuel', value: 'mensuel' }
  ];

  form = this.fb.nonNullable.group({
    lienPatient: ['familial' as 'familial' | 'professionnel', [Validators.required]],
    dateNaissance: ['', [Validators.required]],
    adresse: [''],
    codePostal: [''],
    ville: [''],
    telephoneSecours: [''],
    situationPro: ['' as '' | 'salarie' | 'retraite' | 'sans_activite'],
    frequenceAccompagnement: ['quotidien' as 'quotidien' | 'hebdo' | 'mensuel', [Validators.required]]
  });

  constructor(
    private readonly accompagnantService: AccompagnantService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadExistingProfile();
  }

  get userName(): string {
    return this.currentUser?.prenom
      ? `${this.currentUser.prenom} ${this.currentUser.nom ?? ''}`.trim()
      : 'Accompagnant';
  }

  onSubmit(): void {
    if (!this.currentUser) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const rawValue = this.form.getRawValue();
    const payload: AccompagnantSignupData = { ...rawValue, situationPro: rawValue.situationPro || undefined };

    this.accompagnantService.saveProfile(this.currentUser.id, payload).subscribe({
      next: () => {
        this.authService.markProfileCompleted();
        this.isSubmitting = false;
        setTimeout(() => this.router.navigate(['/home']), 1200);
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  private loadExistingProfile(): void {
    if (!this.currentUser) return;
    this.accompagnantService.getProfile(this.currentUser.id).subscribe({
      next: (profile: any) => {
        this.form.patchValue({
          lienPatient: profile?.lienPatient ?? 'familial',
          dateNaissance: profile?.dateNaissance ?? '',
          adresse: profile?.adresse ?? '',
          codePostal: profile?.codePostal ?? '',
          ville: profile?.ville ?? '',
          telephoneSecours: profile?.telephoneSecours ?? '',
          situationPro: profile?.situationPro ?? '',
          frequenceAccompagnement: profile?.frequenceAccompagnement ?? 'quotidien'
        });
      },
      error: () => {}
    });
  }
}
