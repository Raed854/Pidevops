import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActiviteService } from '../../services/activite.service';
import { SeanceService } from '../../services/seance.service';
import { ReservationService } from '../../services/reservation.service';
import { AbonnementService } from '../../services/abonnement.service';
import { AuthService } from '../../auth/auth.service';
import { Activite } from '../../models/activite.model';
import { Seance, StatutSeance } from '../../models/seance.model';
import { Reservation } from '../../models/reservation.model';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { WebsocketService } from '../../services/websocket.service';
import { CalendrierDoctorComponent } from '../../features/doctor/calendrier-doctor/calendrier-doctor.component';

export interface DashboardStats {
  totalActivities: number;
  totalSessions: number;
  availableSessions: number;
  reservedSessions: number;
  cancelledSessions: number;
  totalReservations: number;
  reservationsPerActivity: { [key: string]: number };
  subscribers: any[];
}

@Component({
  selector: 'app-activities-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendrierDoctorComponent],
  templateUrl: './activities-manage.component.html',
  styleUrls: ['./activities-manage.component.css']
})
export class ActivitiesManageComponent implements OnInit, OnDestroy {

  /* ── Doctor info ── */
  doctorId = 0;
  doctorName = '';

  /* ── Activities ── */
  activites: Activite[] = [];
  showForm = false;
  isEditing = false;
  currentActivite: Partial<Activite> = { titre: '', description: '', image: '', type: '' };
  activityTypes = ['Walking','Light Jogging','Gentle Swimming / Aquagym','Stationary Bike',
    'Gentle Gym / Stretching','Adapted Yoga','Tai Chi','Light Pilates',
    'Balance Exercises','Coordination Games','Dance with Music','Guided Walking',
    'Memory + Movement Exercises'];
  searchTerm = '';
  filterType = '';
  selectedFile: File | null = null;
  selectedFilePreview: string | SafeResourceUrl | null = null;
  isUploading = false;
  isSaving = false;
  viewMode: 'grid' | 'calendar' = 'grid';
  currentWorkspace: 'monitor' | 'library' | 'calendar' = 'monitor';

  /* ── Sessions ── */
  seances: Seance[] = [];
  selectedActivite: Activite | null = null;
  newSeanceDate = '';
  newHeureDebut = '';
  newHeureFin = '';

  /* ── Reservations ── */
  reservations: Reservation[] = [];
  resSearchTerm = '';
  resFilterStatut = '';

  private wsSubscription!: Subscription;
  notificationMessage = '';

  /* ── Stats ── */
  stats: DashboardStats | null = null;
  isLoadingStats = false;

  constructor(
    private activiteService: ActiviteService,
    private seanceService: SeanceService,
    private reservationService: ReservationService,
    private authService: AuthService,
    private wsService: WebsocketService,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.warn('Accès refusé. Redirection login...');
      this.router.navigate(['/login']);
      return;
    }

    this.doctorId = user.id || 0;
    this.doctorName = `${user.prenom || ''} ${user.nom || ''}`.trim();
    console.log('[Dashboard Doctor] Connecté:', this.doctorId, this.doctorName);
    
    this.loadAll();
    
    this.wsSubscription = this.wsService.messages$.subscribe((msg: string) => {
      console.log('Update WebSocket Doctor:', msg);
      const reservationEvents = ['NOUVELLE_RESERVATION', 'RESERVATION_ANNULEE', 'RESERVATION_ACCEPTEE', 'RESERVATION_REFUSEE'];
      if (msg && (msg.includes('UPDATE_SEANCES') || reservationEvents.some(e => msg.includes(e)))) {
        this.loadReservations();
        this.loadSeances();
        this.loadStats();
        if (msg.includes('NOUVELLE_RESERVATION')) this.showNotification('🚀 Nouvelle réservation reçue !');
      }
    });
  }

  loadAll(): void {
    this.loadActivites();
    this.loadSeances();
    this.loadReservations();
    this.loadStats();
  }

  loadStats(): void {
    this.isLoadingStats = true;
    this.http.get<DashboardStats>(`${environment.apiUrl}/api/dashboard/soignant/${this.doctorId}`).subscribe({
      next: (data: DashboardStats) => {
        this.stats = data;
        this.isLoadingStats = false;
      },
      error: () => this.isLoadingStats = false
    });
  }

  setWorkspace(tab: 'monitor' | 'library' | 'calendar') {
    this.currentWorkspace = tab;
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
  }

  showNotification(msg: string) {
    this.notificationMessage = msg;
    setTimeout(() => this.notificationMessage = '', 6000);
  }

  /* ─────────── Activités ─────────── */
  loadActivites(): void {
    console.log(`[Dashboard Doctor] Récupération activitées pour DoctorID: ${this.doctorId}`);
    this.activiteService.getActivitesByDoctor(this.doctorId).subscribe({
      next: (data: Activite[]) => {
        console.log('[Dashboard Doctor] Données reçues:', data);
        this.activites = data;
      },
      error: (err: any) => {
        console.error('[Dashboard Doctor] Erreur API:', err);
        alert('Erreur lors du chargement des activités. Vérifiez la console.');
      }
    });
  }

  get filteredActivites(): Activite[] {
    let list = [...this.activites];
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(a => a.titre?.toLowerCase().includes(term) || a.description?.toLowerCase().includes(term));
    }
    if (this.filterType) list = list.filter(a => a.type === this.filterType);
    return list;
  }

  editActivite(act: Activite): void {
    this.currentActivite = { ...act };
    this.isEditing = true;
    this.showForm = true;
    this.currentWorkspace = 'library';
    this.selectedFilePreview = act.image ? this.getMediaUrl(act.image) : null;
  }

  resetForm(): void {
    this.currentActivite = { titre: '', description: '', image: '', type: '' };
    this.isEditing = false;
    this.selectedFile = null;
    this.selectedFilePreview = null;
    this.showForm = false;
  }

  onFileSelected(event: any): void {
    if (event.target.files?.length) {
      this.selectedFile = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        // Use sanitizer to allow the base64 URL to be used in [src] without security warnings
        this.selectedFilePreview = this.sanitizer.bypassSecurityTrustResourceUrl(reader.result as string);
        console.log('[Dashboard Doctor] Safe Image preview generated');
      };
      reader.readAsDataURL(this.selectedFile as Blob);
    }
  }

  saveActivite(): void {
    if (!this.currentActivite.titre || !this.currentActivite.type) {
      alert('⚠️ Titre et Type obligatoires.');
      return;
    }

    this.isSaving = true;
    const payload: any = {
      id: this.currentActivite.id,
      titre: this.currentActivite.titre,
      description: this.currentActivite.description,
      type: this.currentActivite.type,
      soignant: { id: this.doctorId }
    };
    
    // On n'envoie PAS l'image ici, elle sera envoyée dans le deuxième call si nécessaire
    
    const observer = {
      next: (res: Activite) => {
        if (this.selectedFile) {
          this.uploadImageAndFinish(res.id!);
        } else {
          this.afterSaveSuccess('✅ Activité enregistrée');
        }
      },
      error: (err: any) => {
        console.error('Erreur sauvegarde:', err);
        this.isSaving = false;
        const detail = err.error?.message || err.message || 'Erreur inconnue';
        alert(`❌ Échec de la sauvegarde: ${detail}`);
      }
    };

    if (this.currentActivite.id) {
      this.activiteService.updateActivite(this.currentActivite.id, payload).subscribe(observer);
    } else {
      this.activiteService.createActivite(payload).subscribe(observer);
    }
  }

  private uploadImageAndFinish(id: number) {
    this.activiteService.uploadImage(id, this.selectedFile!).subscribe({
      next: (updatedAct: Activite) => {
        // Sync the local activity object with the one returned from server (contains filename)
        const idx = this.activites.findIndex(a => a.id === id);
        if (idx !== -1) {
          this.activites[idx] = updatedAct;
        }
        this.afterSaveSuccess('✅ Activité et image enregistrées.');
      },
      error: () => this.afterSaveSuccess('⚠️ Activité créée, mais erreur d\'image.')
    });
  }

  private afterSaveSuccess(msg: string = '✅ Activité enregistrée.') {
    this.isUploading = false;
    this.isSaving = false;
    this.showForm = false;
    this.resetForm();
    this.loadActivites();
    this.showNotification(msg);
  }

  private finalizeSave(msg: string) {
    this.isUploading = false;
    this.showForm = false;
    this.resetForm();
    this.loadActivites();
    this.showNotification(msg);
  }

  deleteActivite(id: number): void {
    if (!confirm('Voulez-vous supprimer cette activité ?')) return;
    this.activiteService.deleteActivite(id).subscribe({
      next: () => {
        this.loadActivites();
        this.showNotification('🗑️ Supprimé.');
      },
      error: () => alert('❌ Erreur lors de la suppression.')
    });
  }

  /* ─────────── Séances ─────────── */
  loadSeances(): void {
    this.seanceService.getAllSeances().subscribe(data => this.seances = data);
  }

  selectActivite(act: Activite): void {
    this.selectedActivite = (this.selectedActivite?.id === act.id) ? null : act;
  }

  getSeancesForActivite(activiteId: number): Seance[] {
    return this.seances.filter(s => s.activite?.id === activiteId);
  }

  addSeance(act: Activite): void {
    if (!this.newSeanceDate || !this.newHeureDebut || !this.newHeureFin) {
      alert('⚠️ Veuillez remplir la date et les heures de début/fin.');
      return;
    }
    const seance: Seance = {
      activite: { id: act.id } as any,
      date: this.newSeanceDate,
      heureDebut: this.newHeureDebut + (this.newHeureDebut.length === 5 ? ':00' : ''),
      heureFin: this.newHeureFin + (this.newHeureFin.length === 5 ? ':00' : ''),
      statut: StatutSeance.DISPONIBLE
    };
    console.log('Création séance (Payload):', seance);
    this.seanceService.createSeance(seance).subscribe({
      next: () => {
        console.log('Séance créée avec succès');
        this.loadSeances();
        this.loadActivites(); 
        this.newSeanceDate = ''; this.newHeureDebut = ''; this.newHeureFin = '';
        this.showNotification('📅 Nouveau créneau ajouté avec succès.');
      },
      error: (err) => {
        console.error('Erreur lors de la création de la séance:', err);
        const msg = err.error?.message || 'Erreur inconnue';
        alert(`❌ Échec de l\'ajout du créneau: ${msg}`);
      }
    });
  }

  deleteSeance(id: number): void {
    this.seanceService.deleteSeance(id).subscribe(() => this.loadSeances());
  }

  /* ─────────── Réservations ─────────── */
  loadReservations(): void {
    if (this.doctorId) {
      this.reservationService.getReservationsByDoctor(this.doctorId).subscribe(data => this.reservations = data);
    }
  }

  accepterReservation(id: number): void {
    this.reservationService.accepterReservation(id).subscribe({
      next: () => {
        this.loadAll(); // Full Sync
        this.showNotification('✅ La demande de session a été approuvée.');
      },
      error: (err) => {
        console.error('Accept Error:', err);
        this.showNotification('❌ Échec de l\'approbation. Veuillez réessayer.');
      }
    });
  }

  refuserReservation(id: number): void {
    if (!confirm('Souhaitez-vous vraiment décliner cette demande ? La séance sera remise en disponibilité.')) return;
    this.reservationService.refuserReservation(id).subscribe({
      next: () => {
        this.loadAll(); // Full Sync
        this.showNotification('🚫 Demande déclinée. Le créneau est de nouveau libre.');
      },
      error: (err) => {
        console.error('Decline Error:', err);
        this.showNotification('❌ Échec du refus. Conflit de données possible.');
      }
    });
  }

  annulerReservation(id: number): void {
    if (!confirm('Révoquer cette autorisation ? Cette action libérera le créneau instantanément.')) return;
    this.reservationService.annulerReservation(id).subscribe({
      next: () => {
        this.loadAll(); // Full Sync
        this.showNotification('🔁 Autorisation révoquée. Séance libérée.');
      },
      error: (err) => {
        console.error('Revoke Error:', err);
        this.showNotification('❌ Échec de la révocation.');
      }
    });
  }

  marquerPresence(id: number, present: boolean): void {
    this.reservationService.marquerPresence(id, present).subscribe(() => {
      this.loadReservations();
      this.showNotification(present ? '👤 Accompagnant présent.' : '👤 Accompagnant absent.');
    });
  }


  isImage(url: string | undefined): boolean {
    if (!url) return false;
    // Consistent check with feed module
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || (!this.isVideo(url) && !url.includes('.'));
  }

  isVideo(url: string | undefined): boolean {
    return !!url && /\.(mp4|webm|ogg|mov)$/i.test(url);
  }

  getMediaUrl(imageName: string | undefined): string {
    if (!imageName) return '';
    if (imageName.startsWith('http')) return imageName;
    
    // Using the validated port 8080 for activity media
    return `${environment.apiUrl}/uploads/activites/${imageName}`;
  }
}
