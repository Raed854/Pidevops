import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { SignupRequest } from '../models/signup.model';
import { AuthUser } from '../auth/auth.model';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, IconFieldModule, InputIconModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  private readonly fb = inject(FormBuilder);

  signupForm = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', [Validators.required, Validators.minLength(8)]],
    role: ['PATIENT' as 'PATIENT' | 'SOIGNANT' | 'ACCOMPAGNANT', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  selectRole(role: 'PATIENT' | 'SOIGNANT' | 'ACCOMPAGNANT'): void {
    this.signupForm.get('role')?.setValue(role);
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: SignupRequest = this.signupForm.getRawValue();

    this.authService.signup(payload).subscribe({
      next: (_user: AuthUser) => {
        this.isSubmitting = false;
        this.successMessage = 'Compte créé. Attendez la confirmation de l\'administrateur avant connexion.';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (error) => {
        const status = error?.status;
        if (status === 409) {
          this.errorMessage = 'Cet email est déjà utilisé.';
        } else if (status === 403) {
          this.errorMessage = 'Ce rôle n\'est pas autorisé à l\'inscription.';
        } else if (status === 400) {
          this.errorMessage = 'Vérifiez les champs communs et réessayez.';
        } else {
          this.errorMessage = 'Impossible de créer le compte. Vérifiez le serveur et les paramètres.';
        }
        this.isSubmitting = false;
      }
    });
  }

  backToHome(): void {
    this.router.navigate(['/home']);
  }
}
