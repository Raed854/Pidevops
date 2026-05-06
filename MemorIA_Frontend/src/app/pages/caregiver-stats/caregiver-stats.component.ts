import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { StatsService } from '../../services/stats.service';
import { AuthService } from '../../auth/auth.service';
import { WebsocketService } from '../../services/websocket.service';
import { AbonnementService } from '../../services/abonnement.service';
import { ActiviteService } from '../../services/activite.service';
import { SeanceService } from '../../services/seance.service';
import { ReservationService } from '../../services/reservation.service';
import { Abonnement, TypeAbonnement } from '../../models/abonnement.model';
import { environment } from '../../../environments/environment';
import { Activite } from '../../models/activite.model';
import { Seance } from '../../models/seance.model';
import { Reservation } from '../../models/reservation.model';

@Component({
  selector: 'app-caregiver-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './caregiver-stats.component.html',
  styleUrls: ['./caregiver-stats.component.css']
})
export class CaregiverStatsComponent implements OnInit, OnDestroy {
  // Tabs
  activeTab: 'overview' | 'activities' | 'subscription' = 'overview';

  // Stats
  stats: any = {};
  activityData: any[] = [];
  isLoading = true;
  maxActivityCount = 1;
  currentUser: any;
  notificationMessage = '';

  // Activities Feed
  activites: Activite[] = [];
  seances: Seance[] = [];
  selectedActivite: Activite | null = null;
  searchTerm = '';
  filterType = '';
  activityTypes = ['Walking','Light Jogging','Gentle Swimming / Aquagym','Stationary Bike',
    'Gentle Gym / Stretching','Adapted Yoga','Tai Chi','Light Pilates',
    'Balance Exercises','Coordination Games','Dance with Music','Guided Walking',
    'Memory + Movement Exercises'];

  // Subscription & Payment
  activeAbonnement: Abonnement | null = null;
  subscriptionLoaded = false;
  isProcessing = false;
  errorMessage = '';
  successMessage = '';
  showPaymentModal = false;
  selectedPlan: any = null;
  pricePlans = [
    { name: 'Forfait Mensuel',     type: TypeAbonnement.PACK_4,  sessions: 4,  months: 1,  price: 40  , icon: 'fas fa-leaf' },
    { name: 'Forfait Trimestriel', type: TypeAbonnement.PACK_15, sessions: 15, months: 3,  price: 135 , icon: 'fas fa-bolt', popular: true },
    { name: 'Forfait Annuel',      type: TypeAbonnement.PACK_50, sessions: 50, months: 12, price: 400 , icon: 'fas fa-shield-alt' }
  ];

  // Card details
  cardNumber = '';
  expMonth = '';
  expYear = '';
  cvc = '';

  private wsSubscription!: Subscription;

  constructor(
    private statsService: StatsService,
    private authService: AuthService,
    private abonnementService: AbonnementService,
    private activiteService: ActiviteService,
    private seanceService: SeanceService,
    private reservationService: ReservationService,
    private wsService: WebsocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.id) {
      this.loadAll();
    }

    this.wsSubscription = this.wsService.messages$.subscribe(msg => {
      if (msg === 'UPDATE_SEANCES' || msg.startsWith('RESERVATION_')) {
        this.loadSubscription();
        this.loadSeances();
        if (msg.startsWith('RESERVATION_')) {
          const labels: any = {
            'RESERVATION_ACCEPTEE': 'Votre réservation a été acceptée !',
            'RESERVATION_REFUSEE': 'Votre réservation a été refusée.',
            'RESERVATION_ANNULEE': 'Une réservation a été annulée.'
          };
          if (labels[msg]) this.showNotification(labels[msg]);
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
  }

  loadAll() {
    this.loadMyStats();
    this.loadActivityChart();
    this.loadSubscription();
    this.loadActivites();
    this.loadSeances();
  }

  /* ────────── Overview & Charts ────────── */
  loadMyStats() {
    this.statsService.getUserStats(this.currentUser.id).subscribe({
      next: (data: any) => { this.stats = data; this.isLoading = false; },
      error: () => this.isLoading = false
    });
  }

  loadActivityChart() {
    this.statsService.getActivityChart().subscribe({
      next: (data: any) => {
        this.activityData = data;
        this.maxActivityCount = Math.max(...data.map((d: any) => d.count), 1);
      }
    });
  }

  getBarHeight(count: number): number {
    return Math.max((count / this.maxActivityCount) * 160, 4);
  }

  getDayLabel(dateStr: string): string {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[new Date(dateStr).getDay()];
  }

  /* ────────── Activity Feed ────────── */
  loadActivites(): void {
    this.activiteService.getAllActivites().subscribe({
      next: data => this.activites = data
    });
  }

  loadSeances(): void {
    this.seanceService.getAvailableSeances().subscribe({
      next: data => this.seances = data
    });
  }

  get filteredActivites(): Activite[] {
    let list = [...this.activites];
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(a =>
        a.titre?.toLowerCase().includes(term) ||
        a.description?.toLowerCase().includes(term) ||
        a.doctor?.nom?.toLowerCase().includes(term)
      );
    }
    if (this.filterType) list = list.filter(a => a.type === this.filterType);
    return list;
  }

  selectActivite(act: Activite): void {
    this.selectedActivite = this.selectedActivite?.id === act.id ? null : act;
  }

  getSeancesForActivite(activiteId: number): Seance[] {
    return this.seances.filter(s => s.activite?.id === activiteId);
  }

  reserver(seance: Seance): void {
    if (!this.activeAbonnement || this.activeAbonnement.seancesRestantes <= 0) {
      alert('Vous devez avoir des séances disponibles pour réserver.');
      this.activeTab = 'subscription';
      return;
    }
    if (!confirm(`Réserver la séance du ${seance.date} ?`)) return;

    this.reservationService.reserver(seance.id!, this.currentUser.id).subscribe({
      next: () => {
        this.loadSeances();
        this.loadSubscription();
        this.showNotification('Réservation effectuée !');
      },
      error: err => alert(err.error || 'Erreur réserv.')
    });
  }

  /* ────────── Subscription & Payment ────────── */
  loadSubscription() {
    this.abonnementService.getActiveAbonnement(this.currentUser.id).subscribe({
      next: (data) => { this.activeAbonnement = data; this.subscriptionLoaded = true; },
      error: () => { this.activeAbonnement = null; this.subscriptionLoaded = true; }
    });
  }

  openPayment(plan: any): void {
    this.selectedPlan = plan;
    this.showPaymentModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  formatCardNumber(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    this.cardNumber = value.replace(/(.{4})/g, '$1 ').trim();
  }

  processPayment(): void {
    if (!this.selectedPlan || !this.cardNumber || !this.expMonth || !this.expYear || !this.cvc) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }
    this.isProcessing = true;
    this.errorMessage = '';

    this.abonnementService.createPaymentIntent(this.selectedPlan.type, this.currentUser.id).subscribe({
      next: (res) => {
        this.abonnementService.confirmAbonnement(
          this.selectedPlan.type, 
          this.currentUser.id, 
          res.clientSecret, 
          this.cardNumber, 
          this.expMonth, 
          this.expYear, 
          this.selectedPlan.price
        ).subscribe({
          next: () => {
            this.isProcessing = false;
            this.showPaymentModal = false;
            this.loadSubscription();
            this.successMessage = `Pack "${this.selectedPlan.name}" activé !`;
            setTimeout(() => this.successMessage = '', 6000);
          },
          error: () => { this.isProcessing = false; this.errorMessage = 'Erreur confirmation.'; }
        });
      },
      error: () => { this.isProcessing = false; this.errorMessage = 'Erreur paiement.'; }
    });
  }

  /* ────────── Helpers ────────── */
  getSeancesTotal(): number {
    return this.activeAbonnement ? this.abonnementService.getNombreSeances(this.activeAbonnement.type) : 0;
  }

  getSeancesUsed(): number {
    return this.activeAbonnement ? this.getSeancesTotal() - this.activeAbonnement.seancesRestantes : 0;
  }

  getPlanLabel(): string {
    return this.activeAbonnement ? this.abonnementService.getPlanLabel(this.activeAbonnement.type) : '';
  }

  showNotification(msg: string) {
    this.notificationMessage = msg;
    setTimeout(() => this.notificationMessage = '', 5000);
  }

  getMediaUrl(url: string | undefined): string {
    if (!url) return 'assets/placeholder-activity.jpg';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl}/uploads/activites/${url}`;
  }

  isImage(url: string | undefined): boolean {
    if (!url) return false;
    return !this.isVideo(url);
  }

  isVideo(url: string | undefined): boolean {
    return !!url && /\.(mp4|webm|ogg|mov)$/i.test(url);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
