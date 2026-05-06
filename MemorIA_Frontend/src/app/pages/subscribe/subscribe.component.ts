import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscribe.component.html',
  styleUrls: ['./subscribe.component.css']
})
export class SubscribeComponent implements OnInit {
  plans: any[] = [];
  currentUser: any = null;
  isLoading = true;
  isProcessing = false;
  successMessage = '';
  errorMessage = '';

  selectedPlan: any = null;
  showPaymentForm = false;

  // Card form fields
  cardNumber = '';
  expMonth = '';
  expYear = '';
  cvc = '';

  constructor(
    private subscriptionService: SubscriptionService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadPlans();
  }

  loadPlans() {
    this.subscriptionService.getPlans().subscribe({
      next: (plans) => {
        this.plans = plans;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  selectPlan(plan: any) {
    this.selectedPlan = plan;
    this.showPaymentForm = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelPayment() {
    this.showPaymentForm = false;
    this.selectedPlan = null;
    this.errorMessage = '';
  }

  processPayment() {
    if (!this.selectedPlan || !this.cardNumber || !this.expMonth || !this.expYear || !this.cvc) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    this.subscriptionService.processPayment({
      userId: this.currentUser.id,
      planType: this.selectedPlan.planType,
      cardNumber: this.cardNumber.replace(/\s/g, ''),
      expMonth: parseInt(this.expMonth),
      expYear: parseInt(this.expYear),
      cvc: this.cvc
    }).subscribe({
      next: (result) => {
        this.isProcessing = false;
        if (result.success) {
          this.successMessage = 'Paiement réussi ! Redirection...';
          this.showPaymentForm = false;
          setTimeout(() => this.router.navigate(['/communaute']), 2000);
        } else {
          this.errorMessage = result.message || 'Le paiement a échoué.';
        }
      },
      error: (err) => {
        this.isProcessing = false;
        this.errorMessage = err.error?.message || 'Erreur lors du paiement.';
      }
    });
  }

  formatCardNumber(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/(.{4})/g, '$1 ').trim();
    this.cardNumber = value;
  }

  getPlanIcon(planType: string): string {
    switch (planType) {
      case 'WEEKLY': return 'fas fa-calendar-day';
      case 'MONTHLY': return 'fas fa-calendar-alt';
      case 'YEARLY': return 'fas fa-calendar-check';
      default: return 'fas fa-calendar';
    }
  }

  getPlanPeriod(planType: string): string {
    switch (planType) {
      case 'WEEKLY': return '/ semaine';
      case 'MONTHLY': return '/ mois';
      case 'YEARLY': return '/ an';
      default: return '';
    }
  }

  isPopular(planType: string): boolean {
    return planType === 'MONTHLY';
  }

  getSaving(planType: string): string | null {
    if (planType === 'YEARLY') return 'Économisez 33%';
    return null;
  }
}
