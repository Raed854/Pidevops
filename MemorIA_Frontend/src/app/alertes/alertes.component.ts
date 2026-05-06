import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, interval } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SidebarDiagnosticComponent } from '../components/sidebar_diagnostic/sidebar_diagnostic.component';
import { NavbarComponent } from '../components/navbare/navbare.component';
import { CreateAlertModalComponent } from './components/create-alert-modal.component';
import {
  Alert,
  AlertRole,
  AlertSeverity,
  AlertStatus,
  AlertType,
  CreateAlertRequest,
  WeatherCurrent,
} from '../models/alert.model';
import { AlertService } from '../services/alert.service';
import { AuthService } from '../auth/auth.service';
import { WeatherWidgetComponent } from './components/weather-widget.component';

type UiFilter = 'ALL' | 'UNREAD' | 'CRITICAL' | 'IN_PROGRESS' | 'RESOLVED' | 'OVERDUE_24H';

interface DoctorPatientCard {
  id: number;
  fullName: string;
  initials: string;
  age: number;
  stage: string;
  adherenceRate: number;
  unresolvedCount: number;
  criticalCount: number;
  lastAlertAt?: string;
}

interface DashboardStat {
  label: string;
  value: string;
  subtitle: string;
  tone: 'primary' | 'danger' | 'success';
}

interface TypeStat {
  type: AlertType;
  count: number;
}

interface ChartPoint {
  label: string;
  count: number;
}

@Component({
  selector: 'app-alertes',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, CreateAlertModalComponent, SidebarDiagnosticComponent, WeatherWidgetComponent],
  templateUrl: './templates/alertes-component/alertes.component.html',
  styleUrls: ['./templates/alertes-component/alertes.component.scss']
})
export class AlertesComponent implements OnInit, OnDestroy {
  readonly filters: UiFilter[] = ['ALL', 'UNREAD', 'CRITICAL', 'IN_PROGRESS', 'RESOLVED', 'OVERDUE_24H'];

  alerts: Alert[] = [];
  selectedFilter: UiFilter = 'ALL';
  currentRole: AlertRole = 'PATIENT';
  selectedAlert: Alert | null = null;
  showCreateModal = false;
  loading = false;
  error = '';
  searchTerm = '';
  patientSearchTerm = '';
  creating = false;
  userDisplayName = 'User';
  bulkLoading = false;

  doctorPatients: DoctorPatientCard[] = [];
  filteredDoctorPatients: DoctorPatientCard[] = [];
  selectedDoctorPatient: DoctorPatientCard | null = null;

  selectedAlertIds = new Set<number>();
  noteDrafts: Record<number, string> = {};
  clinicalNotes: Record<number, string[]> = {};
  currentWeather: WeatherCurrent | null = null;
  loadingWeather = false;

  private pollSub?: Subscription;

  constructor(
    private readonly alertService: AlertService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.userDisplayName = [user?.prenom, user?.nom].filter(Boolean).join(' ').trim() || user?.email || 'User';
    this.currentRole = this.alertService.getCurrentRole();
    this.loadAlerts();
    if (this.currentRole === 'PATIENT') {
      this.loadPatientWeather();
    }
    this.pollSub = interval(15000).subscribe(() => this.loadAlerts(true));
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  get isDoctorView(): boolean {
    return this.currentRole === 'DOCTOR';
  }

  get isCaregiverView(): boolean {
    return this.currentRole === 'CAREGIVER';
  }

  get roleTitle(): string {
    if (this.currentRole === 'DOCTOR') {
      return 'Clinical Alert Center - prioritize and resolve risk signals quickly';
    }
    if (this.currentRole === 'CAREGIVER') {
      return 'Caregiver alerts workspace';
    }
    return 'My daily alerts';
  }

  get doctorScopedAlerts(): Alert[] {
    if (!this.isDoctorView) return this.alerts;
    if (!this.selectedDoctorPatient) return [];
    return this.alerts.filter((alert) => alert.patientId === this.selectedDoctorPatient?.id);
  }

  get filteredAlerts(): Alert[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.doctorScopedAlerts
      .filter((alert) => {
        const status = this.normalizeStatus(alert.status);
        const severity = this.normalizeSeverity(alert.severity);

        if (this.selectedFilter === 'UNREAD' && alert.read) return false;
        if (this.selectedFilter === 'CRITICAL' && severity !== 'CRITICAL') return false;
        if (this.selectedFilter === 'IN_PROGRESS' && status !== 'IN_PROGRESS') return false;
        if (this.selectedFilter === 'RESOLVED' && status !== 'RESOLVED') return false;
        if (this.selectedFilter === 'OVERDUE_24H' && !this.isOver24hUntreated(alert)) return false;

        if (!term) return true;

        const title = alert.title?.toLowerCase?.() ?? '';
        const description = alert.description?.toLowerCase?.() ?? '';
        return title.includes(term) || description.includes(term);
      })
      .sort((a, b) => this.alertSortScore(b) - this.alertSortScore(a));
  }

  get criticalAlerts(): Alert[] {
    return this.filteredAlerts.filter((alert) => this.normalizeSeverity(alert.severity) === 'CRITICAL');
  }

  get highAlerts(): Alert[] {
    return this.filteredAlerts.filter((alert) => this.normalizeSeverity(alert.severity) === 'HIGH');
  }

  get mediumAlerts(): Alert[] {
    return this.filteredAlerts.filter((alert) => {
      const severity = this.normalizeSeverity(alert.severity);
      return severity === 'MEDIUM' || severity === 'LOW';
    });
  }

  get doctorDashboardStats(): DashboardStat[] {
    const base = this.doctorScopedAlerts;
    const open = base.filter((a) => this.normalizeStatus(a.status) !== 'RESOLVED').length;
    const criticalToday = base.filter((a) =>
      this.normalizeSeverity(a.severity) === 'CRITICAL' && this.isToday(a.createdAt)
    ).length;

    const total24h = base.filter((a) => this.diffHours(a.createdAt) <= 24).length;
    const resolved24h = base.filter((a) =>
      this.diffHours(a.createdAt) <= 24 && this.normalizeStatus(a.status) === 'RESOLVED'
    ).length;
    const rate = total24h === 0 ? 100 : Math.round((resolved24h / total24h) * 100);

    return [
      { label: 'Open alerts', value: `${open}`, subtitle: 'Not yet resolved', tone: 'primary' },
      { label: 'Critical today', value: `${criticalToday}`, subtitle: 'Need immediate review', tone: 'danger' },
      { label: '24h resolution', value: `${rate}%`, subtitle: `${resolved24h}/${total24h || 0} closed`, tone: 'success' },
    ];
  }

  get predictiveInsights(): string[] {
    const insights: string[] = [];
    const base = this.doctorScopedAlerts;
    const missed = base.filter((a) => this.isMissedReminder(a)).length;
    const criticalOpen = base.filter((a) => this.normalizeSeverity(a.severity) === 'CRITICAL' && this.normalizeStatus(a.status) !== 'RESOLVED').length;

    if (criticalOpen >= 2) {
      insights.push('High risk of cognitive decline in the next 7 days based on recurrent critical events.');
    }
    if (missed >= 3) {
      insights.push('Medication non-adherence trend detected. Consider dosage review and caregiver coaching.');
    }
    if (base.some((a) => a.type === 'CAREGIVER_BURNOUT')) {
      insights.push('Probable caregiver fatigue signal detected. Consider respite support and check-in.');
    }

    return insights.slice(0, 3);
  }

  get topAlertTypes(): TypeStat[] {
    const counts = new Map<AlertType, number>();
    for (const alert of this.doctorScopedAlerts) {
      counts.set(alert.type, (counts.get(alert.type) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  get weeklyTrend(): ChartPoint[] {
    const points: ChartPoint[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const dayKey = day.toISOString().slice(0, 10);
      const count = this.doctorScopedAlerts.filter((alert) => (alert.createdAt || '').slice(0, 10) === dayKey).length;
      points.push({ label: day.toLocaleDateString(undefined, { weekday: 'short' }), count });
    }

    return points;
  }

  get weeklyTrendMax(): number {
    return Math.max(...this.weeklyTrend.map((point) => point.count), 1);
  }

  get selectedCount(): number {
    return this.selectedAlertIds.size;
  }

  get areAllVisibleSelected(): boolean {
    if (!this.filteredAlerts.length) return false;
    return this.filteredAlerts.every((alert) => this.selectedAlertIds.has(alert.id));
  }

  loadAlerts(silent = false): void {
    if (!silent) this.loading = true;
    this.error = '';

    const patientId = this.authService.getCurrentUser()?.id;
    if (this.currentRole === 'PATIENT' && patientId) {
      forkJoin({
        alerts: this.alertService.getMyAlerts('ALL'),
        weatherAlerts: this.alertService.loadWeatherAlerts(patientId)
      }).subscribe({
        next: ({ alerts, weatherAlerts }) => {
          this.alerts = [...(weatherAlerts || []), ...(alerts || [])].sort((a, b) => this.alertSortScore(b) - this.alertSortScore(a));
          this.refreshDoctorPatients();
          this.syncSelection();
          this.loading = false;
        },
        error: (err: unknown) => {
          if (!silent) {
            this.error = this.extractApiErrorMessage(err, 'Unable to load alerts now. Please try again in a moment.');
          }
          this.loading = false;
        }
      });
      return;
    }

    this.alertService.getMyAlerts('ALL').subscribe({
      next: (alerts: Alert[]) => {
        this.alerts = alerts;
        this.refreshDoctorPatients();
        this.syncSelection();
        this.loading = false;
      },
      error: (err: unknown) => {
        if (!silent) {
          this.error = this.extractApiErrorMessage(err, 'Unable to load alerts now. Please try again in a moment.');
        }
        this.loading = false;
      }
    });
  }

  get patientWeatherAlerts(): Alert[] {
    return this.filteredAlerts.filter((alert) => this.isWeatherAlert(alert));
  }

  get patientRegularAlerts(): Alert[] {
    return this.filteredAlerts.filter((alert) => !this.isWeatherAlert(alert));
  }

  isWeatherAlert(alert: Alert): boolean {
    return alert.type === 'WEATHER';
  }

  isDangerousWeatherAlert(alert: Alert): boolean {
    return this.isWeatherAlert(alert) && (alert.severity === 'CRITICAL' || alert.severity === 'HIGH');
  }

  weatherIconForAlert(alert: Alert): string {
    const content = `${alert.title || ''} ${alert.description || ''}`.toLowerCase();
    if (content.includes('storm') || content.includes('orage') || content.includes('thunder')) return '⛈️';
    if (content.includes('rain') || content.includes('pluie')) return '🌧️';
    return '☂️';
  }

  private loadPatientWeather(): void {
    const patientId = this.authService.getCurrentUser()?.id;
    if (!patientId) {
      this.currentWeather = null;
      return;
    }

    this.loadingWeather = true;
    this.alertService.loadCurrentWeather(patientId).subscribe({
      next: (weather) => {
        this.currentWeather = weather;
        this.loadingWeather = false;
      },
      error: () => {
        this.currentWeather = null;
        this.loadingWeather = false;
      }
    });
  }

  onFilterChange(filter: UiFilter): void {
    this.selectedFilter = filter;
    this.selectedAlertIds.clear();
  }

  onDoctorPatientSearch(): void {
    const term = this.patientSearchTerm.trim().toLowerCase();
    this.filteredDoctorPatients = this.doctorPatients.filter((patient) => patient.fullName.toLowerCase().includes(term));

    if (
      this.selectedDoctorPatient
      && !this.filteredDoctorPatients.some((patient) => patient.id === this.selectedDoctorPatient?.id)
    ) {
      this.selectedDoctorPatient = this.filteredDoctorPatients[0] || null;
    }
  }

  selectDoctorPatient(patient: DoctorPatientCard): void {
    this.selectedDoctorPatient = patient;
    this.selectedAlert = null;
    this.selectedAlertIds.clear();
  }

  onCreateAlert(payload: CreateAlertRequest): void {
    if (this.creating) return;

    if (this.isDoctorView && !this.selectedDoctorPatient) {
      this.error = 'Please select a patient before creating an alert.';
      return;
    }

    this.error = '';
    this.creating = true;

    const request: CreateAlertRequest = this.isDoctorView
      ? { ...payload, patientId: this.selectedDoctorPatient?.id }
      : payload;

    this.alertService.createAlert(request).subscribe({
      next: (created: Alert) => {
        this.alerts = [created, ...this.alerts];
        this.refreshDoctorPatients();
        this.showCreateModal = false;
        this.creating = false;
      },
      error: (err: unknown) => {
        this.error = this.extractApiErrorMessage(err, 'Unable to create alert. Please verify caregiver-patient link and try again.');
        this.creating = false;
      }
    });
  }

  onMarkRead(alertId: number): void {
    this.alertService.markRead(alertId).subscribe({ next: (updated) => this.patchAlert(updated) });
  }

  onTakeInCharge(alertId: number): void {
    this.alertService.markInProgress(alertId).subscribe({ next: (updated) => this.patchAlert(updated) });
  }

  onResolve(alertId: number): void {
    this.alertService.resolve(alertId).subscribe({ next: (updated) => this.patchAlert(updated) });
  }

  onDelete(alertId: number): void {
    this.alertService.delete(alertId).subscribe({
      next: () => {
        this.alerts = this.alerts.filter((alert) => alert.id !== alertId);
        this.refreshDoctorPatients();
        if (this.selectedAlert?.id === alertId) this.selectedAlert = null;
      },
      error: (err: unknown) => {
        this.error = err instanceof Error ? err.message : 'Unable to delete alert now. Please try again.';
      }
    });
  }

  toggleAlertSelection(alertId: number, checked: boolean): void {
    if (checked) {
      this.selectedAlertIds.add(alertId);
    } else {
      this.selectedAlertIds.delete(alertId);
    }
  }

  toggleSelectAllVisible(checked: boolean): void {
    if (checked) {
      for (const alert of this.filteredAlerts) {
        this.selectedAlertIds.add(alert.id);
      }
      return;
    }
    this.selectedAlertIds.clear();
  }

  applyBulkAction(action: 'IN_PROGRESS' | 'RESOLVED'): void {
    if (!this.selectedAlertIds.size || this.bulkLoading) return;

    const ids = Array.from(this.selectedAlertIds.values());
    const requests = ids.map((id) => (action === 'RESOLVED' ? this.alertService.resolve(id) : this.alertService.markInProgress(id)));

    this.bulkLoading = true;
    forkJoin(requests)
      .pipe(finalize(() => { this.bulkLoading = false; }))
      .subscribe({
        next: (updatedAlerts) => {
          for (const updated of updatedAlerts) {
            this.patchAlert(updated);
          }
          this.selectedAlertIds.clear();
        },
        error: (err: unknown) => {
          this.error = err instanceof Error ? err.message : 'Bulk action failed. Please retry.';
        }
      });
  }

  saveClinicalNote(alertId: number): void {
    const note = (this.noteDrafts[alertId] || '').trim();
    if (!note) return;

    const existing = this.clinicalNotes[alertId] || [];
    this.clinicalNotes[alertId] = [`${new Date().toLocaleString()} - ${note}`, ...existing].slice(0, 8);
    this.noteDrafts[alertId] = '';
  }

  openReminder(alert: Alert): void {
    if (!alert.reminderId) return;
    window.open(`/doctor/planning?reminderId=${alert.reminderId}`, '_blank');
  }

  exportCriticalAsPdfLike(): void {
    const critical = this.criticalAlerts;
    const html = `
      <html lang="en"><head><title>Critical alerts</title></head><body>
      <h2>Critical alerts - ${this.selectedDoctorPatient?.fullName || 'Patient'}</h2>
      <ul>${critical.map((a) => `<li><b>${a.title}</b> - ${a.description} (${a.createdAt})</li>`).join('')}</ul>
      </body></html>
    `;

    const reportWindow = window.open('', '_blank', 'width=900,height=700');
    if (!reportWindow) {
      this.error = 'Popup blocked. Please allow popups to export report.';
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  }

  filterLabel(filter: UiFilter): string {
    switch (filter) {
      case 'UNREAD':
        return 'Unread';
      case 'CRITICAL':
        return 'Critical';
      case 'IN_PROGRESS':
        return 'In progress';
      case 'RESOLVED':
        return 'Resolved';
      case 'OVERDUE_24H':
        return 'Unprocessed > 24h';
      default:
        return 'All';
    }
  }

  severityBadgeClass(severity: AlertSeverity): string {
    switch (this.normalizeSeverity(severity)) {
      case 'CRITICAL':
        return 'bg-[#CB1527]/10 text-[#CB1527] border-[#CB1527]/25';
      case 'HIGH':
        return 'bg-[#541A75]/10 text-[#541A75] border-[#541A75]/25';
      case 'MEDIUM':
        return 'bg-[#7E7F9A]/15 text-[#5d5f79] border-[#7E7F9A]/30';
      default:
        return 'bg-[#00635D]/10 text-[#00635D] border-[#00635D]/25';
    }
  }

  statusLabel(status: AlertStatus): string {
    switch (this.normalizeStatus(status)) {
      case 'IN_PROGRESS':
        return 'In progress';
      case 'RESOLVED':
        return 'Resolved';
      default:
        return 'New';
    }
  }

  severityScore(alert: Alert): number {
    let score = 20;
    const severity = this.normalizeSeverity(alert.severity);

    if (severity === 'CRITICAL') score += 50;
    if (severity === 'HIGH') score += 35;
    if (severity === 'MEDIUM') score += 20;
    if (this.isMissedReminder(alert)) score += 12;
    if (this.isOver24hUntreated(alert)) score += 10;
    if (this.isEscalated(alert)) score += 8;

    return Math.min(100, score);
  }

  scoreClass(score: number): string {
    if (score >= 80) return 'text-[#CB1527] bg-[#CB1527]/10 border-[#CB1527]/30';
    if (score >= 55) return 'text-amber-600 bg-amber-100 border-amber-200';
    return 'text-[#00635D] bg-[#00635D]/10 border-[#00635D]/30';
  }

  scoreHint(alert: Alert): string {
    const reasons: string[] = [];
    if (this.isMissedReminder(alert)) reasons.push('missed reminder');
    if (this.isOver24hUntreated(alert)) reasons.push('over 24h untreated');
    if (this.normalizeSeverity(alert.severity) === 'CRITICAL') reasons.push('critical clinical signal');

    return `Score ${this.severityScore(alert)}: ${reasons.join(' + ') || 'stable pattern'}`;
  }

  suggestionsFor(alert: Alert): string[] {
    if (alert.type === 'WEATHER') {
      return ['Stay inside if possible', 'Use umbrella and companion support', 'Avoid slippery routes'];
    }
    if (alert.type === 'MEDICATION_MISSED' || alert.type === 'REMINDER_MISSED') {
      return ['Adjust dosage review', 'Contact caregiver now', 'Schedule adherence follow-up'];
    }
    if (alert.type === 'COGNITIVE_DECLINE') {
      return ['Request cognitive assessment', 'Review behavior trend', 'Plan family briefing'];
    }
    return ['Take in charge', 'Add clinical note', 'Plan follow-up call'];
  }

  typeLabel(type: AlertType): string {
    return String(type).replaceAll('_', ' ');
  }

  typeIcon(type: AlertType): string {
    switch (type) {
      case 'MEDICATION_MISSED': return '💊';
      case 'COGNITIVE_DECLINE': return '🧠';
      case 'CAREGIVER_BURNOUT': return '🤝';
      case 'SAFETY': return '🛡️';
      case 'REMINDER_DELAY': return '⏰';
      case 'REMINDER_MISSED': return '🚨';
      case 'WELLBEING': return '💚';
      case 'WEATHER': return '☂️';
      default: return '🔔';
    }
  }

  isMissedReminder(alert: Alert): boolean {
    return alert.type === 'REMINDER_MISSED' || alert.type === 'REMINDER_DELAY';
  }

  isEscalated(alert: Alert): boolean {
    return this.normalizeSeverity(alert.severity) === 'CRITICAL'
      && this.normalizeStatus(alert.status) !== 'RESOLVED'
      && this.diffHours(alert.createdAt) >= 2;
  }

  isOver24hUntreated(alert: Alert): boolean {
    return this.normalizeStatus(alert.status) !== 'RESOLVED' && this.diffHours(alert.createdAt) >= 24;
  }

  patientMessage(): string {
    return 'You are doing great. Let us handle each step together, calmly and safely.';
  }

  trendBarHeight(point: ChartPoint): number {
    return Math.max(10, Math.round((point.count / this.weeklyTrendMax) * 100));
  }

  trackByAlertId(_: number, alert: Alert): number {
    return alert.id;
  }

  trackByPatientId(_: number, patient: DoctorPatientCard): number {
    return patient.id;
  }

  private patchAlert(updated: Alert): void {
    this.alerts = this.alerts.map((alert) => (alert.id === updated.id ? updated : alert));
    this.refreshDoctorPatients();
    if (this.selectedAlert?.id === updated.id) this.selectedAlert = updated;
  }

  private refreshDoctorPatients(): void {
    if (!this.isDoctorView) return;

    const patientMap = new Map<number, DoctorPatientCard>();

    for (const alert of this.alerts) {
      const patientId = alert.patientId;
      const fullName = (alert.patientName || 'Patient').trim();
      const status = this.normalizeStatus(alert.status);
      const isCritical = this.normalizeSeverity(alert.severity) === 'CRITICAL' && status !== 'RESOLVED';
      const existing = patientMap.get(patientId);

      if (!existing) {
        patientMap.set(patientId, {
          id: patientId,
          fullName,
          initials: this.toInitials(fullName),
          age: 67 + (patientId % 16),
          stage: ['Mild', 'Moderate', 'Advanced'][patientId % 3],
          adherenceRate: 60 + (patientId % 35),
          unresolvedCount: status === 'RESOLVED' ? 0 : 1,
          criticalCount: isCritical ? 1 : 0,
          lastAlertAt: alert.createdAt,
        });
        continue;
      }

      if (status !== 'RESOLVED') existing.unresolvedCount += 1;
      if (isCritical) existing.criticalCount += 1;
      if (!existing.lastAlertAt || new Date(alert.createdAt) > new Date(existing.lastAlertAt)) {
        existing.lastAlertAt = alert.createdAt;
      }
    }

    this.doctorPatients = Array.from(patientMap.values()).sort((a, b) => {
      if (b.criticalCount !== a.criticalCount) return b.criticalCount - a.criticalCount;
      if (b.unresolvedCount !== a.unresolvedCount) return b.unresolvedCount - a.unresolvedCount;
      return new Date(b.lastAlertAt || 0).getTime() - new Date(a.lastAlertAt || 0).getTime();
    });

    this.filteredDoctorPatients = [...this.doctorPatients];

    if (!this.selectedDoctorPatient && this.filteredDoctorPatients.length) {
      this.selectedDoctorPatient = this.filteredDoctorPatients[0];
    } else if (this.selectedDoctorPatient) {
      this.selectedDoctorPatient = this.doctorPatients.find((p) => p.id === this.selectedDoctorPatient?.id) || null;
    }
  }

  private syncSelection(): void {
    const available = new Set(this.alerts.map((a) => a.id));
    this.selectedAlertIds.forEach((id) => {
      if (!available.has(id)) this.selectedAlertIds.delete(id);
    });
  }

  private toInitials(fullName: string): string {
    const parts = fullName.split(' ').filter(Boolean);
    if (!parts.length) return 'PT';
    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
  }

  private isToday(dateIso: string): boolean {
    const day = (dateIso || '').slice(0, 10);
    return day === new Date().toISOString().slice(0, 10);
  }

  private diffHours(dateIso: string): number {
    return Math.max(0, (Date.now() - new Date(dateIso).getTime()) / 3600000);
  }

  private normalizeStatus(status: AlertStatus): AlertStatus {
    const value = String(status || '').toUpperCase();
    if (value === 'IN_PROGRESS' || value === 'PRISE_EN_CHARGE') return 'IN_PROGRESS';
    if (value === 'RESOLVED' || value === 'RESOLUE') return 'RESOLVED';
    return 'UNREAD';
  }

  private normalizeSeverity(severity: AlertSeverity): AlertSeverity {
    const value = String(severity || '').toUpperCase();
    if (value === 'CRITICAL' || value === 'CRITIQUE') return 'CRITICAL';
    if (value === 'HIGH' || value === 'ELEVE' || value === 'URGENT') return 'HIGH';
    if (value === 'MEDIUM' || value === 'MOYEN') return 'MEDIUM';
    return 'LOW';
  }

  private alertSortScore(alert: Alert): number {
    const severity = this.normalizeSeverity(alert.severity);
    const sevScore = severity === 'CRITICAL' ? 400 : severity === 'HIGH' ? 300 : severity === 'MEDIUM' ? 200 : 100;
    const weatherBoost = alert.type === 'WEATHER' ? 180 : 0;
    const unreadScore = alert.read ? 0 : 50;
    const escalatedScore = this.isEscalated(alert) ? 100 : 0;
    const reminderScore = this.isMissedReminder(alert) ? 120 : 0;
    const timeScore = new Date(alert.createdAt).getTime() / 1000000000;
    return sevScore + weatherBoost + unreadScore + escalatedScore + reminderScore + timeScore;
  }

  private extractApiErrorMessage(err: unknown, fallback: string): string {
    const raw = err as { error?: { message?: string }; message?: string } | null;
    const apiMessage = raw?.error?.message?.trim();
    if (apiMessage) return apiMessage;
    const message = raw?.message?.trim();
    if (message) return message;
    return fallback;
  }
}

