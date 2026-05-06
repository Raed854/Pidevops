import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActiviteService } from '../../services/activite.service';
import { SeanceService } from '../../services/seance.service';
import { ReservationService } from '../../services/reservation.service';
import { AbonnementService } from '../../services/abonnement.service';
import { WebsocketService } from '../../services/websocket.service';
import { AuthService } from '../../auth/auth.service';
import { Activite } from '../../models/activite.model';
import { Seance } from '../../models/seance.model';
import { Reservation } from '../../models/reservation.model';
import { Abonnement, TypeAbonnement } from '../../models/abonnement.model';
import { Subscription, forkJoin, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';

import { StatsService } from '../../services/stats.service';

@Component({
  selector: 'app-activities-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule],
  templateUrl: './activities-feed.component.html',
  styleUrls: ['./activities-feed.component.css']
})
export class ActivitiesFeedComponent implements OnInit, OnDestroy {

  /* ── User ── */
  userId = 0;
  currentUser: any;


  /* ── Activities ── */
  activites: Activite[] = [];
  seances: Seance[] = [];
  isLoading = false;
  selectedActivite: Activite | null = null;

  activityTypes = ['Walking', 'Light Jogging', 'Gentle Swimming / Aquagym', 'Stationary Bike',
    'Gentle Gym / Stretching', 'Adapted Yoga', 'Tai Chi', 'Light Pilates',
    'Balance Exercises', 'Coordination Games', 'Dance with Music', 'Guided Walking',
    'Memory + Movement Exercises'];

  searchTerm = '';
  filterType = '';

  /* ── Mes réservations ── */
  mesReservations: Reservation[] = [];
  activeTab: 'activities' | 'calendar' | 'reservations' = 'activities';
  viewMode: 'cards' | 'table' = 'cards';

  /* ── Calendar ── */
  calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridWeek,timeGridDay'
    },
    allDaySlot: false,
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    height: 'auto',
    events: [],
    eventClick: this.handleCalendarEventClick.bind(this)
  };

  /* ── Abonnement ── */
  abonnement: Abonnement | null = null;
  mesAbonnements: Abonnement[] = [];
  isLoadingAbonnement = false;
  successMessage = '';
  errorMessage = '';

  private wsSubscription!: Subscription;

  constructor(
    private activiteService: ActiviteService,
    private seanceService: SeanceService,
    private reservationService: ReservationService,
    public abonnementService: AbonnementService,
    private wsService: WebsocketService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUser = user;

    // Final check for ID: Priority to memory, then multiple localStorage fallbacks
    this.userId = user?.id ||
      Number(localStorage.getItem('userId')) ||
      Number(JSON.parse(localStorage.getItem('memoria_auth_user') || '{}').id) ||
      0;

    console.log('--- DEBUG MEMORIA ---');
    console.log('User detected:', user?.nom, user?.prenom);
    console.log('ID detected:', this.userId);
    console.log('---------------------');

    if (this.userId > 0) {
      this.loadAll();
    } else {
      console.warn('[Activities Feed] No User ID found. Dashboard in limited mode.');
    }

    this.wsSubscription = this.wsService.messages$.subscribe((msg: string) => {
      console.log('[Activities Feed] WebSocket Event reçu:', msg);

      // On utilise includes() pour être plus souple sur le format du message
      if (msg && msg.includes('PACK_ACTIVATE')) {
        console.log('[Activities Feed] Activation détectée ! Rechargement...');
        this.showMessage('✅ Votre nouveau pack est prêt !', 'success');
        this.loadAbonnement();
        this.loadMesReservations();
      } else if (msg && (msg.includes('UPDATE_SEANCES') || msg.includes('RESERVATION'))) {
        this.loadAll();
      }
    });
  }

  loadAll(): void {
    console.log('[Activities Feed] Chargement global pour userId:', this.userId);
    this.loadActivites();
    this.loadSeances();
    this.loadAbonnement();
    this.loadMesReservations();
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
  }

  /* ─────────── Activités ─────────── */
  loadActivites(): void {
    this.isLoading = true;
    console.log('[Explorer Dashboard] Récupération de toutes les activités...');
    this.activiteService.getAllActivites().subscribe({
      next: data => {
        console.log('[Explorer Dashboard] Activités reçues:', data);
        this.activites = data;
        this.isLoading = false;
      },
      error: err => {
        console.error('[Explorer Dashboard] Erreur:', err);
        this.isLoading = false;
      }
    });
  }

  get filteredActivites(): Activite[] {
    let list = [...this.activites];
    if (this.searchTerm.trim()) {
      list = list.filter(a =>
        a.titre?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        a.description?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        a.doctor?.nom?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    if (this.filterType) list = list.filter(a => a.type === this.filterType);
    return list;
  }

  selectActivite(act: Activite): void {
    this.selectedActivite = this.selectedActivite?.id === act.id ? null : act;
  }

  /* ─────────── Séances & Calendar ─────────── */
  loadSeances(): void {
    console.log('[Explorer Dashboard] Chargement des séances pour le calendrier...');
    this.seanceService.getAvailableSeances().subscribe({
      next: (data: Seance[]) => {
        this.seances = data;
        const events = data.map(s => {
          let bgColor = '#10b981'; // Emerald (Disponible)
          let borderColor = '#059669';

          if (s.statut === 'RESERVE') {
            bgColor = '#541A75'; // MemorIA Purple
            borderColor = '#3b1252';
          } else if (s.statut === 'ANNULE') {
            bgColor = '#ef4444'; // Rose Red
            borderColor = '#dc2626';
          }

          // Format ISO strict pour FullCalendar
          const startStr = `${s.date}T${s.heureDebut}`;
          const endStr = `${s.date}T${s.heureFin}`;

          return {
            id: s.id?.toString(),
            title: s.activite?.titre || 'Activité',
            start: startStr,
            end: endStr,
            backgroundColor: bgColor,
            borderColor: borderColor,
            extendedProps: { seance: s }
          };
        });
        this.calendarOptions = { ...this.calendarOptions, events };
        console.log(`[Explorer Dashboard] ${events.length} évènements chargés.`);
      },
      error: err => console.error('[Explorer Dashboard] Erreur calendrier:', err)
    });
  }

  getSeancesForActivite(activiteId: number): Seance[] {
    return this.seances.filter(s => s.activite?.id === activiteId);
  }

  handleCalendarEventClick(clickInfo: EventClickArg) {
    const seance = clickInfo.event.extendedProps['seance'];
    this.reserver(seance);
  }

  /* ─────────── Abonnement ─────────── */
  loadAbonnement(): void {
    if (!this.userId) {
      console.warn('[Activities Feed] loadAbonnement aborted: userId is', this.userId);
      return;
    }
    this.isLoadingAbonnement = true;
    console.log('[Activities Feed] Fetching abonnements for userId:', this.userId);

    forkJoin({
      // catchError handles HTTP 204 No Content (returns null gracefully instead of throwing)
      actif: this.abonnementService.getActiveAbonnement(this.userId).pipe(catchError(() => of(null))),
      tous: this.abonnementService.getMesAbonnements(this.userId).pipe(catchError(() => of([])))
    }).subscribe({
      next: (results) => {
        console.log('[Activities Feed] Sync Data Received:', results);
        this.abonnement = results.actif || null;
        this.mesAbonnements = (results.tous as Abonnement[]) || [];
        this.isLoadingAbonnement = false;

        console.log('[Activities Feed] UI STATE UPDATE:');
        console.log('- bookingStatus:', this.bookingStatus);
        console.log('- activePack:', this.abonnement ? 'ID:' + this.abonnement.id + ' seances:' + this.abonnement.seancesRestantes : 'None');
        console.log('- totalHistoryCount:', this.mesAbonnements.length);
      },
      error: (err) => {
        console.error('[Activities Feed] Sync Error:', err);
        this.isLoadingAbonnement = false;
        this.abonnement = null;
        this.mesAbonnements = [];
      }
    });
  }

  getSeancesTotalForPack(abo: Abonnement): number {
    return this.abonnementService.getNombreSeances(abo.type);
  }

  getSeancesUsedForPack(abo: Abonnement): number {
    return this.getSeancesTotalForPack(abo) - (abo.seancesRestantes || 0);
  }

  get bookingStatus(): 'ABONNER' | 'RESERVER' | 'RECHARGER' | 'CHARGEMENT' {
    // While loading, show a neutral state - never redirect user accidentally
    if (this.isLoadingAbonnement) return 'CHARGEMENT';

    // 1. Réserver -> if we have an active pack (filtered by the backend: ACTIF + NOT EXPIRED + sessions > 0)
    if (this.abonnement && this.abonnement.seancesRestantes > 0) {
      return 'RESERVER';
    }

    // 2. Recharger -> if the user has had packs before but none active now
    if (this.mesAbonnements && this.mesAbonnements.length > 0) {
      return 'RECHARGER';
    }

    // 3. S'abonner -> no pack history at all
    return 'ABONNER';
  }

  get isPaid(): boolean {
    return this.bookingStatus === 'RESERVER';
  }

  get seancesRestantes(): number {
    return this.abonnement?.seancesRestantes ?? 0;
  }

  getSeancesTotal(): number {
    if (!this.abonnement) return 0;
    return this.abonnementService.getNombreSeances(this.abonnement.type);
  }

  getSeancesUsed(): number {
    if (!this.abonnement) return 0;
    return this.getSeancesTotal() - this.abonnement.seancesRestantes;
  }

  navigateToPayment(): void {
    this.router.navigate(['/accompagnant-paiement']);
  }

  /* ─────────── Réservation ─────────── */
  reserver(seance: Seance): void {
    if (!this.isPaid || this.seancesRestantes <= 0) {
      this.showMessage('❌ Solde épuisé ou pas d\'abonnement. Veuillez acheter un nouveau pack.', 'error');
      this.navigateToPayment();
      return;
    }
    if (!confirm(`Réserver la séance du ${seance.date} (${seance.heureDebut} - ${seance.heureFin}) ?`)) return;

    this.reservationService.reserver(seance.id!, this.userId).subscribe({
      next: () => {
        this.loadAll();
        this.showMessage('✅ Séance réservée avec succès !', 'success');
      },
      error: err => {
        this.showMessage(err.error || 'Erreur lors de la réservation.', 'error');
      }
    });
  }

  /* ─────────── Mes Réservations ─────────── */
  loadMesReservations(): void {
    if (!this.userId) return;
    this.reservationService.getReservationsByAccompagnant(this.userId).subscribe({
      next: data => this.mesReservations = data,
      error: err => console.error(err)
    });
  }

  annuler(id: number): void {
    if (!confirm('Annuler cette réservation ?')) return;
    this.reservationService.annulerReservation(id).subscribe({
      next: () => { this.loadAll(); this.showMessage('Réservation annulée.', 'success'); },
      error: err => console.error(err)
    });
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'en_attente';
      case 'ACCEPTEE': return 'acceptee';
      case 'REFUSEE': return 'refusee';
      case 'ANNULEE': return 'annulee';
      case 'TERMINEE_PRESENTE': return 'presente';
      case 'TERMINEE_ABSENTE': return 'absente';
      default: return '';
    }
  }


  getPlanLabel(type?: string): string {
    return this.abonnementService.getPlanLabel(type || this.abonnement?.type || '');
  }

  showMessage(msg: string, type: 'success' | 'error') {
    if (type === 'success') {
      this.successMessage = msg;
      setTimeout(() => this.successMessage = '', 6000);
    } else {
      this.errorMessage = msg;
      setTimeout(() => this.errorMessage = '', 6000);
    }
  }


  isImage(url: string | undefined): boolean {
    if (!url) return false;
    // Specific check for common image extensions
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || (!this.isVideo(url) && !url.includes('.'));
  }

  isVideo(url: string | undefined): boolean {
    return !!url && /\.(mp4|webm|ogg|mov)$/i.test(url);
  }

  getMediaUrl(imageName: string | undefined): string {
    if (!imageName) return '';
    if (imageName.startsWith('http')) return imageName;
    
    // Support for both port 8080 and potential fallback to 8081 if configured in environment
    // For now, sticking strictly to 8080 as identified in the research
    return `${environment.apiUrl}/uploads/activites/${imageName}`;
  }
}
