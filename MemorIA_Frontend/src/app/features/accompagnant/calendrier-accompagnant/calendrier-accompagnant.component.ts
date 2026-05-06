import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import { SeanceService } from '../../../services/seance.service';
import { ReservationService } from '../../../services/reservation.service';
import { AbonnementService } from '../../../services/abonnement.service';
import { Seance, StatutSeance } from '../../../models/seance.model';
import { WebsocketService } from '../../../services/websocket.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-calendrier-accompagnant',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  template: `
    <div class="acc-calendar-wrapper">
      <div class="header-info">
        <div class="header-top">
          <i class="fas fa-calendar-check main-icon"></i>
          <div>
            <h2>Réserver une Séance</h2>
            <p class="subtitle">Sélectionnez un créneau disponible pour votre patient</p>
          </div>
        </div>
        
        <div class="stats-row">
          <div class="credit-badge" [class.danger]="seancesRestantes <= 0">
            <i class="fas fa-ticket-alt"></i>
            <span *ngIf="seancesRestantes >= 0"><strong>{{ seancesRestantes }}</strong> séances disponibles</span>
            <span *ngIf="seancesRestantes < 0">Aucun pack actif</span>
          </div>
          <button class="btn-buy" (click)="goToPayment()">
            <i class="fas fa-plus-circle"></i> Acheter un pack
          </button>
        </div>

        <div class="feedback-toast" *ngIf="message" [ngClass]="messageType">
          <i class="fas" [ngClass]="messageType === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'"></i>
          {{ message }}
        </div>
      </div>

      <div class="calendar-card">
        <full-calendar [options]="calendarOptions"></full-calendar>
      </div>
    </div>
  `,
  styles: [`
    .acc-calendar-wrapper { padding: 40px 20px; background: #f4f7fa; min-height: 100vh; }
    .header-info { max-width: 1200px; margin: 0 auto 32px; }
    
    .header-top { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
    .main-icon { font-size: 40px; color: #3b82f6; background: white; padding: 15px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header-top h2 { margin: 0; font-size: 28px; font-weight: 800; color: #1e293b; }
    .subtitle { margin: 4px 0 0; color: #64748b; font-size: 16px; }

    .stats-row { display: flex; align-items: center; justify-content: space-between; background: white; padding: 16px 24px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin-bottom: 20px; }
    
    .credit-badge { display: flex; align-items: center; gap: 10px; font-size: 1.1rem; color: #3b82f6; font-weight: 600; }
    .credit-badge.danger { color: #ef4444; }
    .credit-badge i { font-size: 1.3rem; }

    .btn-buy { display: flex; align-items: center; gap: 8px; background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .btn-buy:hover { background: #2563eb; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }

    .feedback-toast { display: flex; align-items: center; gap: 12px; padding: 16px 24px; border-radius: 12px; font-weight: 600; font-size: 15px; margin-bottom: 20px; animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .feedback-toast.success { background: #ecfdf5; color: #10b981; border: 1px solid #bbf7d0; }
    .feedback-toast.error { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
    
    .calendar-card { background: white; padding: 24px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); max-width: 1200px; margin: 0 auto; border: 1px solid #e2e8f0; }
  `]
})
export class CalendrierAccompagnantComponent implements OnInit, OnDestroy {
  seancesRestantes = -1;
  message = '';
  messageType = '';
  private accompagnantId = 0;
  private wsSubscription!: Subscription;

  calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: { left: 'prev,next', center: 'title', right: 'timeGridWeek,timeGridDay' },
    events: [],
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    eventClick: this.handleEventClick.bind(this)
  };

  private seanceService = inject(SeanceService);
  private reservationService = inject(ReservationService);
  private abonnementService = inject(AbonnementService);
  private wsService = inject(WebsocketService);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {}

  goToPayment() {
    this.router.navigate(['/accompagnant-paiement']);
  }

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.accompagnantId = user?.id ?? 0;
    this.checkCredits();
    this.loadAvailableSeances();

    this.wsSubscription = this.wsService.messages$.subscribe(() => {
      this.loadAvailableSeances();
      this.checkCredits();
    });
  }

  ngOnDestroy() {
    if(this.wsSubscription) this.wsSubscription.unsubscribe();
  }

  checkCredits() {
    this.abonnementService.getActiveAbonnement(this.accompagnantId).subscribe({
      next: (abo: any) => {
        if(abo) this.seancesRestantes = abo.seancesRestantes;
        else this.seancesRestantes = -1;
      },
      error: () => this.seancesRestantes = -1
    });
  }

  loadAvailableSeances() {
    this.seanceService.getAvailableSeances().subscribe((data: any[]) => {
      const events = data.map((s: any) => ({
        id: s.id?.toString(),
        title: s.activite?.titre,
        start: `${s.date}T${s.heureDebut}`,
        end: `${s.date}T${s.heureFin}`,
        backgroundColor: '#3b82f6', // Bleu pour indiquer que c'est réservable
        borderColor: '#2563eb',
        extendedProps: { seance: s }
      }));
      this.calendarOptions = { ...this.calendarOptions, events };
    });
  }

  handleEventClick(clickInfo: EventClickArg) {
    if (this.seancesRestantes <= 0) {
      this.showMessage("Vous n'avez pas de crédits suffisants.", 'error');
      return;
    }
    
    if (confirm(`Voulez-vous réserver la séance "${clickInfo.event.title}" ?`)) {
      this.reservationService.reserver(parseInt(clickInfo.event.id), this.accompagnantId).subscribe({
        next: () => {
          this.showMessage("Réservation demandée avec succès ! (En attente de validation)", 'success');
          this.loadAvailableSeances();
          this.checkCredits();
        },
        error: (err) => {
          this.showMessage(err.error || "Erreur lors de la réservation", 'error');
        }
      });
    }
  }

  showMessage(msg: string, type: string) {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 5000);
  }
}
