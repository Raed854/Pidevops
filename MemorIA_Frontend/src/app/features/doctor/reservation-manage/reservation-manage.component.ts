import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationService } from '../../../services/reservation.service';
import { Reservation, StatutReservation } from '../../../models/reservation.model';
import { AuthService } from '../../../auth/auth.service';
import { WebsocketService } from '../../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-reservation-manage',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="manage-container">
      <div class="header-section">
        <h2>Demandes de Réservations</h2>
        <p class="subtitle">Gérez les demandes de séances et suivez la présence des accompagnants.</p>
      </div>

      <div class="table-container">
        <table class="styled-table">
          <thead>
            <tr>
              <th>Patient / Accompagnant</th>
              <th>Activité</th>
              <th>Date & Heure</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let res of reservations" [class.active-row]="res.statut === 'EN_ATTENTE'">
              <td>
                <div class="user-info">
                  <span class="user-name">{{ res.accompagnant?.nom }} {{ res.accompagnant?.prenom }}</span>
                  <span class="user-email">{{ res.accompagnant?.email }}</span>
                </div>
              </td>
              <td><span class="activity-tag">{{ res.seance?.activite?.titre }}</span></td>
              <td>
                <div class="date-time">
                  <span class="date">{{ res.seance?.date | date:'dd/MM/yyyy' }}</span>
                  <span class="time">{{ res.seance?.heureDebut }} - {{ res.seance?.heureFin }}</span>
                </div>
              </td>
              <td>
                <span class="status-badge" [ngClass]="res.statut.toLowerCase()">
                  {{ formatStatut(res.statut) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <!-- Actions pour EN_ATTENTE -->
                  <ng-container *ngIf="res.statut === 'EN_ATTENTE'">
                    <button class="btn btn-accept" (click)="accepter(res.id!)" title="Accepter">
                      <i class="fas fa-check"></i> Accepter
                    </button>
                    <button class="btn btn-refuse" (click)="refuser(res.id!)" title="Refuser">
                      <i class="fas fa-times"></i> Refuser
                    </button>
                  </ng-container>

                  <!-- Actions pour ACCEPTEE -->
                  <ng-container *ngIf="res.statut === 'ACCEPTEE'">
                    <button class="btn btn-present" (click)="marquerPresence(res.id!, true)" title="Présent">
                      <i class="fas fa-user-check"></i> Présent
                    </button>
                    <button class="btn btn-absent" (click)="marquerPresence(res.id!, false)" title="Absent">
                      <i class="fas fa-user-times"></i> Absent
                    </button>
                  </ng-container>

                  <!-- Statuts finaux -->
                  <span class="status-final" *ngIf="isStatusFinal(res.statut)">
                    <i class="fas fa-lock"></i> Terminé
                  </span>
                </div>
              </td>
            </tr>
            <tr *ngIf="reservations.length === 0">
              <td colspan="5" class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Aucune demande de réservation trouvée.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .manage-container { padding: 2rem; background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
    .header-section { margin-bottom: 2rem; }
    h2 { color: #0f172a; font-weight: 700; margin-bottom: 0.25rem; }
    .subtitle { color: #64748b; font-size: 0.95rem; }
    
    .table-container { background: white; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #e2e8f0; }
    .styled-table { width: 100%; border-collapse: collapse; text-align: left; }
    .styled-table th { background: #f1f5f9; padding: 1rem 1.5rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
    .styled-table td { padding: 1.25rem 1.5rem; vertical-align: middle; border-bottom: 1px solid #f1f5f9; }
    .styled-table tbody tr:hover { background: #f8fafc; }
    
    .user-info { display: flex; flex-direction: column; }
    .user-name { font-weight: 600; color: #1e293b; }
    .user-email { font-size: 0.8rem; color: #64748b; }
    
    .activity-tag { background: #3b82f6; color: white; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; font-weight: 500; }
    
    .date-time { display: flex; flex-direction: column; }
    .date { font-weight: 500; color: #334155; }
    .time { font-size: 0.85rem; color: #64748b; }

    .status-badge { padding: 4px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; display: inline-block; }
    .status-badge.en_attente { background: #fef3c7; color: #92400e; }
    .status-badge.acceptee { background: #dcfce7; color: #166534; }
    .status-badge.refusee { background: #fee2e2; color: #991b1b; }
    .status-badge.annulee { background: #f1f5f9; color: #475569; }
    .status-badge.terminee_presente { background: #dbeafe; color: #1e40af; }
    .status-badge.terminee_absente { background: #ffedd5; color: #9a3412; }
    
    .action-buttons { display: flex; gap: 0.75rem; align-items: center; }
    .btn { padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 500; border: none; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; }
    .btn-accept { background: #10b981; color: white; }
    .btn-accept:hover { background: #059669; transform: translateY(-1px); }
    .btn-refuse { background: #ef4444; color: white; }
    .btn-refuse:hover { background: #dc2626; transform: translateY(-1px); }
    .btn-present { background: #3b82f6; color: white; }
    .btn-present:hover { background: #2563eb; }
    .btn-absent { background: #f97316; color: white; }
    .btn-absent:hover { background: #ea580c; }
    
    .status-final { color: #94a3b8; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; }
    
    .empty-state { text-align: center; padding: 4rem !important; color: #94a3b8; }
    .empty-state i { font-size: 3rem; margin-bottom: 1rem; opacity: 0.3; }
  `]
})
export class ReservationManageComponent implements OnInit, OnDestroy {
  reservations: Reservation[] = [];
  private doctorId = 0;
  private wsSubscription: Subscription | null = null;

  constructor(
    private reservationService: ReservationService,
    private authService: AuthService,
    private wsService: WebsocketService
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.doctorId = user?.id ?? 0;
    this.loadReservations();

    // S'abonner aux notifications WebSocket
    this.wsService.subscribe('/topic/reservations', (msg: any) => {
      console.log('Notification reçue:', msg);
      this.loadReservations();
    });
  }

  ngOnDestroy() {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
  }

  loadReservations() {
    this.reservationService.getReservationsByDoctor(this.doctorId).subscribe({
      next: (data) => {
        this.reservations = data.sort((a, b) => {
          // Trier par date décroissante
          return new Date(b.dateReservation).getTime() - new Date(a.dateReservation).getTime();
        });
      },
      error: (err) => console.error("Erreur lors du chargement des réservations", err)
    });
  }

  accepter(id: number) {
    this.reservationService.accepterReservation(id).subscribe(() => this.loadReservations());
  }

  refuser(id: number) {
    if(confirm("Êtes-vous sûr de vouloir refuser cette demande ?")) {
      this.reservationService.refuserReservation(id).subscribe(() => this.loadReservations());
    }
  }

  marquerPresence(id: number, present: boolean) {
    this.reservationService.marquerPresence(id, present).subscribe(() => this.loadReservations());
  }

  isStatusFinal(statut: string): boolean {
    return [
      StatutReservation.REFUSEE, 
      StatutReservation.ANNULEE, 
      StatutReservation.TERMINEE_PRESENTE, 
      StatutReservation.TERMINEE_ABSENTE
    ].includes(statut as StatutReservation);
  }

  formatStatut(statut: string): string {
    switch(statut) {
      case 'EN_ATTENTE': return 'En Attente';
      case 'ACCEPTEE': return 'Acceptée';
      case 'REFUSEE': return 'Refusée';
      case 'ANNULEE': return 'Annulée';
      case 'TERMINEE_PRESENTE': return 'Présent';
      case 'TERMINEE_ABSENTE': return 'Absent';
      default: return statut;
    }
  }
}

