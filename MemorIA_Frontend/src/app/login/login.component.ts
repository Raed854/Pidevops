import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  isSubmitting = false;
  errorMessage = '';
  private readonly fb = inject(FormBuilder);
  private readonly returnUrl: string | null;

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    const nav = this.router.getCurrentNavigation();
    const stateReturnUrl = nav?.extras?.state?.['returnUrl'] ?? history.state?.returnUrl;
    this.returnUrl = typeof stateReturnUrl === 'string' ? stateReturnUrl : null;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: (user) => {
        this.isSubmitting = false;
        const role = user.role.toUpperCase();
        if (this.returnUrl) {
          this.router.navigateByUrl(this.returnUrl);
          return;
        }
        if (role === 'ADMINISTRATEUR') {
          this.router.navigate(['/users']);
          return;
        }
        if (role === 'PATIENT') {
          this.router.navigate(['/diagnostic']);
          return;
        }
        if (!user.profileCompleted) {
          this.router.navigate([this.getProfileRoute(user.role)]);
          return;
        }
        if (role === 'SOIGNANT') {
          this.router.navigate(['/dashboard_diagnostic']);
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        const status = error?.status;
        if (status === 401) {
          this.errorMessage = 'Invalid email or password.';
        } else if (status === 403) {
          this.errorMessage = 'Account pending admin confirmation.';
        } else {
          this.errorMessage = 'Login failed. Please try again.';
        }
      }
    });
  }

  private getProfileRoute(role: string): string {
    const normalizedRole = role.toUpperCase();
    if (normalizedRole === 'PATIENT') return '/profile/patient';
    if (normalizedRole === 'SOIGNANT') return '/profile/soignant';
    return '/profile/accompagnant';
  }
}
