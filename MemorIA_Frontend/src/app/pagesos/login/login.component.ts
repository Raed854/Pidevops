import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user-models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;

  constructor(private authService: AuthService, private router: Router) {
    // If already logged in, redirect to home
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/tests-cognitifs']);
    }
  }

  /**
   * Handle login form submission
   */
  onLogin(): void {
    this.errorMessage = '';

    // Validate form
    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez entrer votre email et mot de passe';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Email invalide';
      return;
    }

    this.isLoading = true;

    const loginRequest: LoginRequest = {
      email: this.email,
      password: this.password
    };

    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.id) {
          // Login successful
          this.authService.handleLoginSuccess(response);
          
          // Route to tests-cognitifs with aidant ID if user is an aidant
          if (response.role === 'AIDANT') {
            this.router.navigate(['/tests-cognitifs'], {
              queryParams: { aidantId: response.id }
            });
          } else {
            this.router.navigate(['/tests-cognitifs']);
          }
        } else {
          // Login failed
          this.errorMessage = response.message || 'Email ou mot de passe incorrect';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Login error:', error);
        this.errorMessage = 'Erreur de connexion. Veuillez réessayer.';
      }
    });
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Handle Enter key press
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onLogin();
    }
  }
}
