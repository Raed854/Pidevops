import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, forkJoin, takeUntil } from 'rxjs';

import { NavbarComponent } from '../../components/navbare/navbare.component';
import { SidebarDiagnosticComponent } from '../../components/sidebar_diagnostic/sidebar_diagnostic.component';
import { AlertCardComponent } from '../components/alert-card-redesigned.component';
import { ManualAlertModalComponent } from '../components/manual-alert-modal.component';
import { CaregiverChatPanelComponent } from '../components/caregiver-chat-panel.component';
import { WeatherWidgetComponent } from '../components/weather-widget.component';

import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../auth/auth.service';
import { WeatherService } from '../../services/weather.service';
import { Alert, WeatherCurrent } from '../../models/alert.model';

export type AlertFilterType = 'all' | 'critical' | 'today' | 'unresolved' | 'resolved';
export type ErrorType = 'forbidden' | 'no-patient' | 'server-error' | null;

export interface PatientHeaderData {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  stage: string;
  adherenceRate?: number;
  globalRiskScore?: number;
  unresolvedAlerts?: number;
}

@Component({
  selector: 'app-caregiver-alertes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    AlertCardComponent,
    ManualAlertModalComponent,
    CaregiverChatPanelComponent,
    SidebarDiagnosticComponent
  ],
  templateUrl: '../templates/caregiver-alertes-component/caregiver-alertes.component.html',
  styleUrls: ['../templates/caregiver-alertes-component/caregiver-alertes.component.scss']
})
export class CaregiverAlertesComponent implements OnInit, OnDestroy {
  
  selectedPatient: PatientHeaderData | null = null;
  caregiverPatients: any[] = [];
  isLoadingPatients = true;
  allAlerts: Alert[] = [];
  filteredAlerts: Alert[] = [];
  currentWeather: WeatherCurrent | null = null;
  isLoadingWeather = false;
  kpiData: any = null;
  isLoading = true;
  isLoadingAlerts = false;
  hasError = false;
  errorType: ErrorType = null;
  errorMessage = '';
  showChatPanel = false;
  showManualAlertModal = false;
  hasBackendError = false;
  selectedAlertFilter: AlertFilterType = 'all';
  patientSearchTerm = '';
  alertSearchTerm = '';

  alertFilters: Array<{ label: string; value: AlertFilterType }> = [
    { label: 'Toutes les alertes', value: 'all' },
    { label: 'Critiques', value: 'critical' },
    { label: "Aujourd'hui", value: 'today' },
    { label: 'Non traitées', value: 'unresolved' },
    { label: 'Résolues', value: 'resolved' }
  ];

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private alertService: AlertService,
    private authService: AuthService,
    private weatherService: WeatherService
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.loadCaregiverPatients();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get linkedPatientName(): string {
    if (!this.selectedPatient) return 'Aucun patient';
    return `${this.selectedPatient.firstName} ${this.selectedPatient.lastName}`.trim();
  }

  get filteredPatients(): any[] {
    const term = this.patientSearchTerm.trim().toLowerCase();
    if (!term) return this.caregiverPatients;

    return this.caregiverPatients.filter((p) => {
      const fullName = `${p?.firstName || ''} ${p?.lastName || ''}`.toLowerCase();
      return fullName.includes(term);
    });
  }

  private loadCaregiverPatients(): void {
    this.isLoadingPatients = true;
    this.alertService
      .getCaregiverPatients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patients) => {
          const uniquePatients = this.deduplicatePatients(patients || []);

          if (!uniquePatients.length) {
            this.hasError = true;
            this.errorType = 'no-patient';
            this.isLoading = false;
            this.isLoadingPatients = false;
            return;
          }

          this.hasError = false;
          this.errorType = null;
          this.caregiverPatients = uniquePatients;
          this.selectPatient(uniquePatients[0]);
          this.isLoading = false;
          this.isLoadingPatients = false;
        },
        error: (error: any) => {
          this.isLoading = false;
          this.isLoadingPatients = false;
          this.hasError = true;

          if (error?.status === 403) {
            this.errorType = 'forbidden';
            this.errorMessage = 'Vous n\'avez pas d\'accès aux alertes des patients.';
          } else if (error?.status === 404) {
            this.errorType = 'no-patient';
          } else {
            this.errorType = 'server-error';
          }
        }
      });
  }

  selectPatient(patient: any): void {
    this.selectedPatient = {
      id: patient.id || 0,
      firstName: patient.firstName || 'Patient',
      lastName: patient.lastName || '',
      age: patient.age || 0,
      stage: patient.stage || 'Moderate',
      adherenceRate: patient.adherenceRate ?? patient.adherence ?? 75,
      globalRiskScore: patient.globalRiskScore ?? patient.globalRisk ?? 50,
      unresolvedAlerts: patient.unresolvedAlerts ?? 0
    };

    this.loadAlertsForPatient(patient.id);
    this.loadWeatherForPatient(patient.id);
    this.loadKpiData(patient.id);
  }

  private deduplicatePatients(patients: any[]): any[] {
    const map = new Map<number, any>();
    for (const p of patients) {
      if (p?.id != null && !map.has(p.id)) map.set(p.id, p);
    }
    return Array.from(map.values());
  }

  private deduplicateAlerts(alerts: Alert[]): Alert[] {
    const map = new Map<number, Alert>();
    for (const a of alerts) {
      if (a?.id != null) map.set(a.id, a);
    }
    return Array.from(map.values());
  }

  private loadAlertsForPatient(patientId: number): void {
    this.isLoadingAlerts = true;
    forkJoin({
      alerts: this.alertService.getPatientAlerts(patientId),
      weatherAlerts: this.alertService.loadWeatherAlerts(patientId)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ alerts, weatherAlerts }) => {
          this.allAlerts = this.sortAlerts([...(weatherAlerts || []), ...(alerts || [])]);
          this.applyAlertFilter(this.selectedAlertFilter);
          this.isLoadingAlerts = false;
        },
        error: () => {
          this.allAlerts = [];
          this.hasBackendError = true;
          this.isLoadingAlerts = false;
        }
      });
  }

  private loadWeatherForPatient(patientId: number): void {
    this.isLoadingWeather = true;
    this.currentWeather = null;

    this.weatherService
      .getCurrentTunisWeather()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (weather) => {
          this.currentWeather = weather;
          this.isLoadingWeather = false;
        },
        error: () => {
          this.currentWeather = null;
          this.isLoadingWeather = false;
        }
      });
  }

  private loadKpiData(patientId: number): void {
    this.alertService
      .getPatientKpi(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (kpi) => {
          this.kpiData = kpi;
        },
        error: () => {
          this.kpiData = {
            alertsToday: 0,
            criticalUnresolved: 0,
            responseRate: 0
          };
        }
      });
  }

  private setupSearchDebounce(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyAlertFilter(this.selectedAlertFilter);
      });
  }

  onSearchChange(): void {
    this.searchSubject$.next(this.alertSearchTerm);
  }

  applyAlertFilter(filterType: AlertFilterType): void {
    this.selectedAlertFilter = filterType;
    let filtered = [...this.allAlerts];

    switch (filterType) {
      case 'critical':
        filtered = filtered.filter(a => a.severity === 'CRITICAL');
        break;
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter(a => {
          const alertDate = new Date(a.createdAt);
          alertDate.setHours(0, 0, 0, 0);
          return alertDate.getTime() === today.getTime();
        });
        break;
      case 'unresolved':
        filtered = filtered.filter(a => a.status !== 'RESOLVED');
        break;
      case 'resolved':
        filtered = filtered.filter(a => a.status === 'RESOLVED');
        break;
      case 'all':
      default:
        break;
    }

    if (this.alertSearchTerm.trim()) {
      const term = this.alertSearchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        (a.title?.toLowerCase() ?? '').includes(term) ||
        (a.description?.toLowerCase() ?? '').includes(term)
      );
    }

    this.filteredAlerts = filtered;
  }

  getCriticalAlerts(): Alert[] {
    return this.filteredAlerts.filter(a => a.severity === 'CRITICAL' && !this.isWeatherAlert(a));
  }

  getNonCriticalAlerts(): Alert[] {
    return this.filteredAlerts.filter(a => a.severity !== 'CRITICAL' && !this.isWeatherAlert(a));
  }

  getPriorityWeatherAlerts(): Alert[] {
    return this.filteredAlerts.filter((a) => this.isWeatherAlert(a));
  }

  isWeatherAlert(alert: Alert): boolean {
    return alert.type === 'WEATHER';
  }

  isDangerousWeatherAlert(alert: Alert): boolean {
    return this.isWeatherAlert(alert) && (alert.severity === 'CRITICAL' || alert.severity === 'HIGH');
  }

  isDangerousWeather(): boolean {
    if (!this.currentWeather) return false;
    const weather = this.currentWeather.condition.toLowerCase();
    return weather.includes('rain') || weather.includes('pluie') || 
           weather.includes('storm') || weather.includes('orage') ||
           weather.includes('snow') || weather.includes('neige');
  }

  getWeatherWarning(): string {
    if (!this.currentWeather) return '';
    const weather = this.currentWeather.condition.toLowerCase();
    
    if (weather.includes('rain') || weather.includes('pluie')) {
      return '🌧️ Pluie détectée - Ne pas sortir de la maison sans nécessité';
    }
    if (weather.includes('storm') || weather.includes('orage') || weather.includes('thunder')) {
      return '⛈️ Orage en cours - Rester à l\'intérieur est fortement recommandé';
    }
    if (weather.includes('snow') || weather.includes('neige')) {
      return '❄️ Neige - Éviter les sorties, risque de glissance';
    }
    if (weather.includes('wind') || weather.includes('vent')) {
      return '💨 Grand vent - Sorties déconseillées';
    }
    return 'Conditions météorologiques défavorables détectées';
  }

  weatherIconForAlert(alert: Alert): string {
    const content = `${alert.title || ''} ${alert.description || ''}`.toLowerCase();
    if (content.includes('storm') || content.includes('orage') || content.includes('thunder')) return '⛈️';
    if (content.includes('rain') || content.includes('pluie')) return '🌧️';
    if (content.includes('snow') || content.includes('neige')) return '❄️';
    return '☂️';
  }

  private sortAlerts(alerts: Alert[]): Alert[] {
    const severityOrder: Record<Alert['severity'], number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3
    };

    return alerts.sort((a, b) => {
      const weatherPriorityDiff = this.getWeatherPriority(b) - this.getWeatherPriority(a);
      if (weatherPriorityDiff !== 0) return weatherPriorityDiff;

      const severityDiff = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
      if (severityDiff !== 0) return severityDiff;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  private getWeatherPriority(alert: Alert): number {
    if (!this.isWeatherAlert(alert)) {
      return 0;
    }
    if (alert.severity === 'CRITICAL') {
      return 3;
    }
    if (alert.severity === 'HIGH') {
      return 2;
    }
    return 1;
  }

  handleAlertAction(event: { alertId: number; action: 'acknowledge' | 'resolve' | 'note' }): void {
    const alert = this.allAlerts.find(a => a.id === event.alertId);
    if (!alert) return;

    switch (event.action) {
      case 'acknowledge':
        this.markAlertInProgress(alert);
        break;
      case 'resolve':
        this.resolveAlert(alert);
        break;
      case 'note':
        console.log('Add note for alert:', event.alertId);
        break;
    }
  }

  private markAlertInProgress(alert: Alert): void {
    const previousStatus = alert.status;
    // Optimistic update
    alert.status = 'IN_PROGRESS';
    this.applyAlertFilter(this.selectedAlertFilter);

    this.alertService.markInProgress(alert.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Success - keep the update
          this.applyAlertFilter(this.selectedAlertFilter);
        },
        error: (error) => {
          // Revert on error
          alert.status = previousStatus;
          this.applyAlertFilter(this.selectedAlertFilter);
          console.error('Error marking alert as in progress:', error);
        }
      });
  }

  private resolveAlert(alert: Alert): void {
    const previousStatus = alert.status;
    // Optimistic update
    alert.status = 'RESOLVED';
    this.applyAlertFilter(this.selectedAlertFilter);

    this.alertService.resolveAlert(alert.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Success - keep the update
          this.applyAlertFilter(this.selectedAlertFilter);
          if (this.selectedPatient?.id) {
            this.loadKpiData(this.selectedPatient.id);
          }
        },
        error: (error) => {
          // Revert on error
          alert.status = previousStatus;
          this.applyAlertFilter(this.selectedAlertFilter);
          console.error('Error resolving alert:', error);
        }
      });
  }

  getResolutionRate(): number {
    if (this.allAlerts.length === 0) return 0;
    const resolved = this.allAlerts.filter(a => a.status === 'RESOLVED').length;
    return Math.round((resolved / this.allAlerts.length) * 100);
  }

  openManualAlertModal(): void {
    if (this.selectedPatient) {
      this.showManualAlertModal = true;
    }
  }

  closeManualAlertModal(): void {
    this.showManualAlertModal = false;
  }

  openChatPanel(): void {
    this.showChatPanel = true;
  }

  closeChatPanel(): void {
    this.showChatPanel = false;
  }

  onAlertCreated(newAlert: Alert): void {
    const index = this.allAlerts.findIndex(a => a.id === newAlert.id);

    if (index >= 0) {
      this.allAlerts[index] = newAlert;
    } else {
      this.allAlerts = [newAlert, ...this.allAlerts];
    }

    this.allAlerts = this.sortAlerts(this.deduplicateAlerts(this.allAlerts));
    this.applyAlertFilter(this.selectedAlertFilter);
    this.showManualAlertModal = false;

    if (this.selectedPatient?.id) {
      this.loadKpiData(this.selectedPatient.id);
      this.loadAlertsForPatient(this.selectedPatient.id);
    }

    console.log('✅ Alerte créée avec succès:', newAlert.title);
  }

  trackByPatientId(_: number, p: any): number {
    return p?.id;
  }

  trackByAlertId(_: number, a: Alert): number {
    return a?.id;
  }

  onModalClosed(): void {
    this.closeManualAlertModal();
  }

  getPatientInitials(patient?: any): string {
    const p = patient || this.selectedPatient;
    if (!p) return '';
    return (p.firstName?.charAt(0) + p.lastName?.charAt(0)).toUpperCase();
  }
}
