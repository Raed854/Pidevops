import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReservationService } from '../../../services/reservation.service';
import { Reservation } from '../../../models/reservation.model';
import { AuthService } from '../../../auth/auth.service';
import { AbonnementService } from '../../../services/abonnement.service';
import { Abonnement } from '../../../models/abonnement.model';

@Component({
  selector: 'app-mes-reservations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reservations-container">
      <!-- Active Subscription Section -->
      <div class="active-pack-section" *ngIf="activeAbonnement">
        <div class="pack-card glass">
          <div class="pack-info">
            <div class="pack-badge">PACK {{ activeAbonnement.type }}</div>
            <div class="pack-details">
              <h3>Votre Pack Actuel</h3>
              <p>Valide du <strong>{{ activeAbonnement.dateDebut | date:'dd MMM yyyy' }}</strong> au <strong>{{ activeAbonnement.dateFin | date:'dd MMM yyyy' }}</strong></p>
            </div>
            <div class="pack-stats">
              <div class="stat-item">
                <span class="stat-value">{{ activeAbonnement.seancesRestantes }}</span>
                <span class="stat-label">Restantes</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-value">{{ activeAbonnement.seancesTotal }}</span>
                <span class="stat-label">Total</span>
              </div>
            </div>
          </div>
          <div class="pack-progress">
             <div class="progress-bg">
               <div class="progress-fill" [style.width.%]="(activeAbonnement.seancesRestantes / activeAbonnement.seancesTotal) * 100"></div>
             </div>
             <div class="progress-text">Utilisation : {{ activeAbonnement.seancesTotal - activeAbonnement.seancesRestantes }} / {{ activeAbonnement.seancesTotal }} séances réservées</div>
          </div>
        </div>
      </div>

      <div class="header">
        <div class="header-left">
          <h2>Mes Séances Réservées</h2>
          <p>Suivez l'état de vos réservations et vos rendez-vous à venir.</p>
        </div>
        <div class="view-toggle">
          <button [class.active]="viewMode === 'cards'" (click)="viewMode = 'cards'"><i class="fas fa-th"></i></button>
          <button [class.active]="viewMode === 'table'" (click)="viewMode = 'table'"><i class="fas fa-list"></i></button>
        </div>
      </div>

      <div class="grid-container" *ngIf="viewMode === 'cards'">
        <div class="res-card" *ngFor="let res of reservations">
          <div class="card-header" [ngClass]="res.statut.toLowerCase()">
            <span class="status-icon">
              <i class="fa fa-clock" *ngIf="res.statut === 'EN_ATTENTE'"></i>
              <i class="fa fa-check-circle" *ngIf="res.statut === 'ACCEPTEE'"></i>
              <i class="fa fa-times-circle" *ngIf="res.statut === 'REFUSEE' || res.statut === 'ANNULEE'"></i>
              <i class="fa fa-user-check" *ngIf="res.statut === 'TERMINEE_PRESENTE'"></i>
              <i class="fa fa-user-times" *ngIf="res.statut === 'TERMINEE_ABSENTE'"></i>
            </span>
            <h4>{{ res.statut }}</h4>
          </div>
          <div class="card-body">
            <h3>{{ res.seance?.activite?.titre }}</h3>
            <p class="doctor-name"><i class="fa fa-user-md"></i> Dr. {{ res.seance?.activite?.doctor?.nom || 'Non spécifié' }}</p>
            <div class="datetime">
              <div class="date-box">
                <i class="fa fa-calendar"></i> {{ res.seance?.date | date:'longDate' }}
              </div>
              <div class="time-box">
                <i class="fa fa-clock"></i> {{ res.seance?.heureDebut }} - {{ res.seance?.heureFin }}
              </div>
            </div>
          </div>
          <div class="card-footer" *ngIf="res.statut === 'EN_ATTENTE' || res.statut === 'ACCEPTEE'">
            <button class="btn-cancel" (click)="annuler(res.id!)">Annuler ma réservation</button>
          </div>
        </div>
      </div>

      <div class="table-card" *ngIf="viewMode === 'table' && reservations.length > 0">
        <table class="res-table">
          <thead>
            <tr>
              <th>Activité</th>
              <th>Date</th>
              <th>Heure</th>
              <th>Médecin</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let res of reservations">
              <td><strong>{{ res.seance?.activite?.titre }}</strong></td>
              <td>{{ res.seance?.date | date:'mediumDate' }}</td>
              <td>{{ res.seance?.heureDebut }} - {{ res.seance?.heureFin }}</td>
              <td>Dr. {{ res.seance?.activite?.doctor?.nom }}</td>
              <td>
                <span class="status-badge" [ngClass]="res.statut.toLowerCase()">{{ res.statut }}</span>
              </td>
              <td>
                <button class="btn-cancel-sm" *ngIf="['EN_ATTENTE','ACCEPTEE'].includes(res.statut)" (click)="annuler(res.id!)">Annuler</button>
                <span *ngIf="!['EN_ATTENTE','ACCEPTEE'].includes(res.statut)">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="empty-state" *ngIf="reservations.length === 0">
        <p>Vous n'avez aucune séance réservée pour le moment.</p>
        <button class="btn-primary" (click)="goToCalendar()">Réserver une séance</button>
      </div>
    </div>
  `,
  styles: [`
    .reservations-container { padding: 3rem 2rem; background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
    
    /* Pack Card Styles */
    .active-pack-section { margin-bottom: 3rem; }
    .pack-card { background: white; border-radius: 20px; padding: 2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid rgba(59, 130, 246, 0.1); overflow: hidden; position: relative; }
    .pack-card.glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); }
    .pack-info { display: flex; align-items: center; gap: 2rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .pack-badge { background: #3b82f6; color: white; padding: 8px 16px; border-radius: 100px; font-weight: 800; font-size: 0.8rem; letter-spacing: 0.5px; }
    .pack-details { flex-grow: 1; }
    .pack-details h3 { margin: 0 0 4px 0; color: #1e293b; font-size: 1.5rem; }
    .pack-details p { margin: 0; color: #64748b; font-size: 0.95rem; }
    .pack-stats { display: flex; align-items: center; gap: 2rem; background: #f1f5f9; padding: 12px 24px; border-radius: 16px; }
    .stat-item { text-align: center; }
    .stat-value { display: block; font-size: 1.5rem; font-weight: 800; color: #1e293b; }
    .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700; }
    .stat-divider { width: 1px; height: 30px; background: #cbd5e1; }
    .pack-progress { margin-top: 1rem; }
    .progress-bg { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
    .progress-fill { height: 100%; background: #3b82f6; border-radius: 4px; transition: width 1s ease-out; }
    .progress-text { font-size: 0.85rem; color: #64748b; font-weight: 600; }

    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
    .view-toggle { display: flex; background: #e2e8f0; padding: 4px; border-radius: 8px; }
    .view-toggle button { border: none; background: transparent; padding: 6px 12px; cursor: pointer; color: #64748b; border-radius: 6px; }
    .view-toggle button.active { background: white; color: #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

    .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 2rem; }
    
    .res-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); display: flex; flex-direction: column; transition: transform 0.3s; }
    .res-card:hover { transform: translateY(-5px); }
    
    .card-header { padding: 1rem 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: white; }
    .status-icon { font-size: 1.2rem; }
    .card-header h4 { margin: 0; font-weight: 700; letter-spacing: 0.5px; text-transform: capitalize; }
    .card-header.en_attente { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .card-header.acceptee { background: linear-gradient(135deg, #10b981, #059669); }
    .card-header.refusee, .card-header.annulee { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .card-header.terminee_presente { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    .card-header.terminee_absente { background: #94a3b8; }
    
    .card-body { padding: 1.5rem; flex-grow: 1; }
    .card-body h3 { margin: 0 0 0.5rem 0; color: #0f172a; font-size: 1.25rem; }
    .doctor-name { color: #64748b; margin-bottom: 1.5rem; font-size: 0.95rem; }
    
    .datetime { display: flex; flex-direction: column; gap: 0.8rem; background: #f1f5f9; padding: 1rem; border-radius: 12px; }
    .date-box, .time-box { display: flex; align-items: center; gap: 0.5rem; color: #334155; font-weight: 600; font-size: 0.95rem; }
    .datetime i { color: #3b82f6; }
    
    .card-footer { padding: 1.2rem 1.5rem; background: #fafafa; border-top: 1px solid #f1f5f9; }
    .btn-cancel { width: 100%; padding: 10px; background: white; border: 1px solid #ef4444; color: #ef4444; border-radius: 8px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
    .btn-cancel:hover { background: #fee2e2; }

    /* Table styles */
    .table-card { background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); overflow: hidden; }
    .res-table { width: 100%; border-collapse: collapse; }
    .res-table th { background: #f8fafc; padding: 1rem; text-align: left; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; }
    .res-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: capitalize; }
    .status-badge.en_attente { background: #fef3c7; color: #d97706; }
    .status-badge.acceptee { background: #dcfce7; color: #16a34a; }
    .status-badge.refusee, .status-badge.annulee { background: #fee2e2; color: #ef4444; }
    .btn-cancel-sm { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 4px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; }
    
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 4rem; color: #64748b; background: white; border-radius: 20px; }
    .btn-primary { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; cursor: pointer; margin-top: 1rem; }
  `]
})
export class MesReservationsComponent implements OnInit {
  reservations: Reservation[] = [];
  viewMode: 'cards' | 'table' = 'cards';
  activeAbonnement: Abonnement | null = null;
  private accompagnantId = 0;

  constructor(
    private reservationService: ReservationService,
    private abonnementService: AbonnementService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.accompagnantId = user?.id ?? 0;
    this.loadReservations();
    this.loadActiveSubscription();
  }

  loadActiveSubscription() {
    if (this.accompagnantId) {
      this.abonnementService.getActiveAbonnement(this.accompagnantId).subscribe({
        next: (sub) => this.activeAbonnement = sub,
        error: (err) => console.error("Erreur chargement abonnement", err)
      });
    }
  }

  loadReservations() {
    this.reservationService.getReservationsByAccompagnant(this.accompagnantId).subscribe({
      next: (data) => this.reservations = data,
      error: (err) => console.error("Erreur", err)
    });
  }

  annuler(id: number) {
    if (confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
      this.reservationService.annulerReservation(id).subscribe(() => this.loadReservations());
    }
  }

  goToCalendar() {
    this.router.navigate(['/calendrier-accompagnant']);
  }
}
