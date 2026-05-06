import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PlanningService, PatientAssignment, Reminder, ReminderStats, CalendarEvent } from '../../../../services/planning.service';
import { AuthService } from '../../../../services/auth.service';
import { Chart } from 'chart.js/auto';
import { NavbarComponent } from '../../../../components/navbare/navbare.component';
import { SidebarDiagnosticComponent } from '../../../../components/sidebar_diagnostic/sidebar_diagnostic.component';

@Component({
  selector: 'app-caregiver-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent, SidebarDiagnosticComponent],
  templateUrl: './caregiver-planning.component.html',
  styleUrls: ['./caregiver-planning.component.css']
})
export class CaregiverPlanningComponent implements OnInit, OnDestroy {

  // Données
  myPatients: PatientAssignment[] = [];
  selectedPatient: PatientAssignment | null = null;
  reminders: Reminder[] = [];
  stats: ReminderStats | null = null;
  calendarEvents: CalendarEvent[] = [];

  // État UI
  isLoading = false;
  hasError  = false;
  errorMessage = '';
  currentDate = new Date();
  viewMode: 'month' | 'week' | 'day' = 'month';
  selectedReminder: Reminder | null = null;
  showDetailModal = false;
  showCreateModal = false;
  showDelayModal = false;
  delayReminderPreview: { reminder: Reminder; suggestedTime: string } | null = null;

  // Charts
  medicationChart: Chart | null = null;
  activityChart: Chart | null = null;
  forgetfulnessChart: Chart | null = null;

  private destroy$ = new Subject<void>();
  private chartContainers = {
    medication: 'medicationChartContainer',
    activity: 'activityChartContainer',
    forgetfulness: 'forgetfulnessChartContainer'
  };

  // Couleurs par type
  readonly typeColors = {
    medication: { bg: '#CB1527', border: '#8B0D1D' },
    appointment: { bg: '#1e40af', border: '#1e3a8a' },
    activity: { bg: '#00635D', border: '#004D47' },
    test: { bg: '#7C3AED', border: '#6D28D9' }
  };

  // Stubs pour formulaire création/modification
  newReminder: {
    type: 'medication' | 'appointment' | 'activity' | 'test' | 'meal' | 'hygiene' | 'walk' | 'other';
    title: string;
    description: string;
    scheduledTime: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    category: string;
  } = {
    type: 'medication',
    title: '',
    description: '',
    scheduledTime: '',
    priority: 'normal',
    category: ''
  };

  constructor(
    private planningService: PlanningService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadMyPatients();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  /**
   * Charge la liste des patients assignés
   */
  loadMyPatients(): void {
    const currentUser = this.authService.getUser();
    if (!currentUser) {
      console.error('[CaregiverPlanning] Aucun utilisateur connecté');
      this.isLoading = false;
      return;
    }

    console.log('[CaregiverPlanning] Chargement patients pour user:', currentUser.id, currentUser.email);

    this.isLoading = true;
    this.hasError  = false;
    // Passer userId ET email comme double sécurité
    this.planningService.getMyPatients(currentUser.id, currentUser.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patients) => {
          this.myPatients = patients || [];
          this.isLoading  = false;
          if (this.myPatients.length === 0) return;
          const primary = this.myPatients.find(p => p.isPrimary);
          this.selectPatient(primary || this.myPatients[0]);
        },
        error: (err) => {
          console.error('[CaregiverPlanning] Erreur chargement patients:', err);
          this.isLoading    = false;
          this.hasError     = true;
          this.errorMessage = err?.error?.message
            || `Erreur ${err?.status}: impossible de charger les patients.`;
          this.myPatients = [];
        }
      });
  }

  /**
   * Sélectionne un patient et charge ses données
   */
  selectPatient(patient: PatientAssignment): void {
    this.selectedPatient = patient;
    this.loadPatientData();
  }

  /**
   * Charge tous les données du patient sélectionné
   */
  private loadPatientData(): void {
    if (!this.selectedPatient) return;

    this.isLoading = true;
    const patientId = this.selectedPatient.patientId;
    const today = new Date().toISOString().split('T')[0];

    // Charger les rappels du jour
    this.planningService.getPatientReminders(patientId, today)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reminders) => {
          this.reminders = this.sortRemindersByTime(reminders);
          this.isLoading = false;
        },
        error: (err) => console.error('Erreur rappels:', err)
      });

    // Charger les statistiques
    this.planningService.getAdherenceStats(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
          setTimeout(() => this.renderCharts(), 300);
        },
        error: (err) => console.error('Erreur stats:', err)
      });
  }

  /**
   * Trie les rappels par heure
   */
  private sortRemindersByTime(reminders: Reminder[]): Reminder[] {
    return reminders.sort((a, b) => {
      const timeA = new Date(a.scheduledTime).getTime();
      const timeB = new Date(b.scheduledTime).getTime();
      return timeA - timeB;
    });
  }

  /**
   * Formate l'heure pour affichage
   */
  formatTime(date: string): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Formate la date pour affichage
   */
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Récupère l'icône par type de rappel
   */
  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'medication': '💊',
      'appointment': '🏥',
      'activity': '🎯',
      'test': '🔬'
    };
    return icons[type] || '📋';
  }

  /**
   * Récupère la couleur de statut
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pending': '#FCA5A5',
      'confirmed': '#86EFAC',
      'delayed': '#FBBF24',
      'missed': '#F87171'
    };
    return colors[status] || '#E5E7EB';
  }

  /**
   * Récupère le label de statut
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'En attente',
      'confirmed': 'Confirmé',
      'delayed': 'Reporté',
      'missed': 'Manqué'
    };
    return labels[status] || status;
  }

  /**
   * Récupère la couleur de bordure pour un type de rappel
   */
  getBorderColor(type: string): string {
    return this.typeColors[type as keyof typeof this.typeColors]?.bg || '#E5E7EB';
  }

  /**
   * Ouvre le modal de détails
   */
  openDetailModal(reminder: Reminder): void {
    this.selectedReminder = reminder;
    this.showDetailModal = true;
  }

  /**
   * Ferme le modal de détails
   */
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedReminder = null;
  }

  /**
   * Confirme un rappel
   */
  confirmReminder(reminder: Reminder): void {
    this.planningService.confirmReminder(reminder.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.reminders.findIndex(r => r.id === updated.id);
          if (index >= 0) {
            this.reminders[index] = updated;
          }
          this.closeDetailModal();
        },
        error: (err) => console.error('Erreur confirmation:', err)
      });
  }

  /**
   * Ouvre le modal pour reporter
   */
  openDelayModal(reminder: Reminder): void {
    this.selectedReminder = reminder;
    const currentTime = new Date(reminder.scheduledTime);
    const suggestedTime = new Date(currentTime.getTime() + 60 * 60 * 1000); // +1h
    this.delayReminderPreview = {
      reminder,
      suggestedTime: suggestedTime.toISOString()
    };
    this.showDelayModal = true;
  }

  /**
   * Reporte un rappel
   */
  delayReminder(newTime: string): void {
    if (!this.selectedReminder) return;

    this.planningService.delayReminder(this.selectedReminder.id, newTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.reminders.findIndex(r => r.id === updated.id);
          if (index >= 0) {
            this.reminders[index] = updated;
          }
          this.showDelayModal = false;
          this.selectedReminder = null;
          this.delayReminderPreview = null;
        },
        error: (err) => console.error('Erreur report:', err)
      });
  }

  /**
   * Supprime un rappel
   */
  deleteReminder(reminder: Reminder): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rappel ?')) return;

    this.planningService.deleteReminder(reminder.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.reminders = this.reminders.filter(r => r.id !== reminder.id);
          this.closeDetailModal();
        },
        error: (err) => console.error('Erreur suppression:', err)
      });
  }

  /**
   * Combine "Reporter automatiquement" pour tous les non-confirmés
   */
  autoDelayAll(): void {
    if (!this.selectedPatient) return;

    if (!confirm('Reporter automatiquement tous les rappels non confirmés ?')) return;

    this.planningService.autoDelayPendingReminders(this.selectedPatient.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          alert(`${result.count} rappel(s) reporté(s).`);
          this.loadPatientData();
        },
        error: (err) => console.error('Erreur auto-delay:', err)
      });
  }

  /**
   * Crée un nouveau rappel
   */
  createNewReminder(): void {
    if (!this.selectedPatient) return;

    this.planningService.createReminder(this.selectedPatient.patientId, this.newReminder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reminder) => {
          this.reminders.push(reminder);
          this.reminders = this.sortRemindersByTime(this.reminders);
          this.resetForm();
          this.showCreateModal = false;
        },
        error: (err) => console.error('Erreur création:', err)
      });
  }

  /**
   * Réinitialise le formulaire
   */
  private resetForm(): void {
    this.newReminder = {
      type: 'medication',
      title: '',
      description: '',
      scheduledTime: '',
      priority: 'normal',
      category: ''
    };
  }

  /**
   * Rend les graphiques Chart.js
   */
  private renderCharts(): void {
    if (!this.stats) return;

    this.destroyCharts();

    // Graphique adhérence médicaments
    this.renderMedicationChart();

    // Graphique adhérence activités
    this.renderActivityChart();

    // Graphique oublis
    this.renderForgetfulnessChart();
  }

  /**
   * Graphique adhérence médicaments (circulaire)
   */
  private renderMedicationChart(): void {
    const ctx = document.getElementById(this.chartContainers.medication) as HTMLCanvasElement;
    if (!ctx) return;

    const confirmed = this.stats?.medicationAdherence ?? 0;
    const missed = 100 - confirmed;

    this.medicationChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Confirmés', 'Non confirmés'],
        datasets: [{
          data: [confirmed, missed],
          backgroundColor: ['#00635D', '#FECACA'],
          borderColor: ['#004D47', '#FCA5A5'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  /**
   * Graphique adhérence activités
   */
  private renderActivityChart(): void {
    const ctx = document.getElementById(this.chartContainers.activity) as HTMLCanvasElement;
    if (!ctx) return;

    const confirmed = this.stats?.activityAdherence ?? 0;
    const missed = 100 - confirmed;

    this.activityChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Confirmées', 'Non confirmées'],
        datasets: [{
          data: [confirmed, missed],
          backgroundColor: ['#7C3AED', '#FECACA'],
          borderColor: ['#6D28D9', '#FCA5A5'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  /**
   * Graphique forgetfulness trend (barres sur 7j)
   */
  private renderForgetfulnessChart(): void {
    const ctx = document.getElementById(this.chartContainers.forgetfulness) as HTMLCanvasElement;
    if (!ctx) return;

    // Protéger contre forgetfulnessTrend null/undefined
    const trend = (this.stats?.forgetfulnessTrend ?? []).slice(-7);

    // Si pas de données, afficher un graphique vide avec les 7 derniers jours
    const labels = trend.length > 0
      ? trend.map(t => {
          const d = new Date(t.date);
          return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
        })
      : Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
        });

    const data = trend.length > 0 ? trend.map(t => t.count) : Array(7).fill(0);

    this.forgetfulnessChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Oublis par jour',
          data,
          backgroundColor: '#CB1527',
          borderColor: '#8B0D1D',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'x',
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: { beginAtZero: true, max: Math.max(...data, 10) }
        }
      }
    });
  }

  /**
   * Détruit les graphiques
   */
  private destroyCharts(): void {
    this.medicationChart?.destroy();
    this.activityChart?.destroy();
    this.forgetfulnessChart?.destroy();
  }

  /**
   * Navigue vers jour précédent/suivant
   */
  previousPeriod(): void {
    if (this.viewMode === 'month') {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1);
    } else if (this.viewMode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() - 1);
    }
    this.loadPatientData();
  }

  nextPeriod(): void {
    if (this.viewMode === 'month') {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1);
    } else if (this.viewMode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() + 1);
    }
    this.loadPatientData();
  }

  /**
   * Télécharge le PDF du planning
   */
  exportPDF(): void {
    if (!this.selectedPatient) return;

    this.planningService.exportWeeklyPlanningPDF(this.selectedPatient.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `planning_${this.selectedPatient!.patientName}_${new Date().toISOString().split('T')[0]}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => console.error('Erreur export PDF:', err)
      });
  }

  /**
   * Rafraîchit le planning toutes les 5 min
   */
  private startAutoRefresh(): void {
    setInterval(() => {
      if (this.selectedPatient) {
        this.loadPatientData();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Retourne le nombre de rappels en attente
   */
  getPendingCount(): number {
    return this.reminders.filter(r => r.status === 'pending').length;
  }

  /**
   * Retourne le nombre de rappels confirmés
   */
  getConfirmedCount(): number {
    return this.reminders.filter(r => r.status === 'confirmed').length;
  }
}
