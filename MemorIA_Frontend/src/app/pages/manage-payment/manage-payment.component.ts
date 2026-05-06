import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService } from '../../auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-manage-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-payment.component.html',
  styleUrls: ['./manage-payment.component.css']
})
export class ManagePaymentComponent implements OnInit {
  communityBaseUrl = environment.communityApiUrl;
  currentUser: any = null;
  subscription: any = null;
  isLoading = true;
  isCancelling = false;

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
    this.loadStatus();
  }

  loadStatus() {
    this.subscriptionService.getStatus(this.currentUser.id).subscribe({
      next: (data) => {
        this.subscription = data;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  cancelSubscription() {
    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) return;
    this.isCancelling = true;
    this.subscriptionService.cancel(this.currentUser.id).subscribe({
      next: () => {
        this.subscription.active = false;
        this.isCancelling = false;
      },
      error: () => this.isCancelling = false
    });
  }

  getPlanLabel(planType: string): string {
    switch (planType) {
      case 'WEEKLY': return 'Hebdomadaire';
      case 'MONTHLY': return 'Mensuel';
      case 'YEARLY': return 'Annuel';
      default: return planType || 'N/A';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  goBack() {
    this.router.navigate(['/communaute']);
  }

  goToSubscribe() {
    this.router.navigate(['/subscribe']);
  }
}
