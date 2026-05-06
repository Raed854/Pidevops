import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService } from '../../auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-manage-subscriptions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-subscriptions.component.html',
  styleUrls: ['./manage-subscriptions.component.css']
})
export class ManageSubscriptionsComponent implements OnInit {
  communityBaseUrl = environment.communityApiUrl;
  subscriptions: any[] = [];
  isLoading = true;
  currentUser: any = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.role !== 'SOIGNANT') {
      this.router.navigate(['/home']);
      return;
    }
    this.loadSubscriptions();
  }

  loadSubscriptions() {
    this.subscriptionService.getAllSubscriptions().subscribe({
      next: (data) => {
        this.subscriptions = data;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  deleteSubscription(id: number) {
    if (!confirm('Supprimer cet abonnement ? Cette action est irréversible.')) return;
    this.subscriptionService.deleteSubscription(id).subscribe({
      next: () => {
        this.subscriptions = this.subscriptions.filter(s => s.id !== id);
      }
    });
  }

  getUserName(sub: any): string {
    const u = sub.user;
    if (!u) return 'N/A';
    return (u.firstName || u.prenom || '') + ' ' + (u.lastName || u.nom || '');
  }

  getPlanLabel(planType: string): string {
    switch (planType) {
      case 'WEEKLY': return 'Hebdomadaire';
      case 'MONTHLY': return 'Mensuel';
      case 'YEARLY': return 'Annuel';
      default: return planType || 'N/A';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'active';
      case 'CANCELLED': return 'cancelled';
      case 'EXPIRED': return 'expired';
      default: return 'inactive';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  get activeCount(): number {
    return this.subscriptions.filter(s => s.status === 'ACTIVE').length;
  }

  get totalRevenue(): string {
    // Rough estimation placeholder
    return this.subscriptions.filter(s => s.status === 'ACTIVE').length.toString();
  }

  goBack() {
    this.router.navigate(['/communaute']);
  }
}
