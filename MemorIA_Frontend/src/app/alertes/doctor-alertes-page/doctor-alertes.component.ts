import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { NavbarComponent } from '../../components/navbare/navbare.component';
import { SidebarDiagnosticComponent } from '../../components/sidebar_diagnostic/sidebar_diagnostic.component';

import { AlertCardComponent } from '../components/alert-card-redesigned.component';
import { DailyEvolutionChartComponent, DailyData } from '../components/charts/daily-evolution-chart.component';
import { TopAlertTypesChartComponent, TopAlertType } from '../components/charts/top-alert-types-chart.component';
import { DailySummaryComponent } from '../components/daily-summary.component';
import { PredictiveAlertsComponent, PredictiveAlert } from '../components/predictive-alerts.component';
import { WeatherWidgetComponent } from '../components/weather-widget.component';
import { ClinicalNotesPanelComponent } from '../components/clinical-notes-panel.component';
import { CaregiverChatPanelComponent } from '../components/caregiver-chat-panel.component';

import { DoctorPlanningService } from '../../services/doctor-planning.service';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../auth/auth.service';
import { WeatherService } from '../../services/weather.service';

import { DoctorPatient } from '../../models/patient.model';
import { Alert, AlertSeverity, WeatherCurrent } from '../../models/alert.model';

export interface DailySummary {
  text: string;
  timestamp: Date;
}

export type AlertFilterType = 'all' | 'critical' | 'high' | 'unresolved';
export type AlertStatus = 'UNREAD' | 'IN_PROGRESS' | 'RESOLVED';
export type AlertAction = { action: 'take-charge' | 'resolve' | 'add-note'; alertId: number };
export type AlertFilter = AlertStatus | 'ALL';

@Component({
  selector: 'app-doctor-alertes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    SidebarDiagnosticComponent,
    AlertCardComponent,
    DailyEvolutionChartComponent,
    ClinicalNotesPanelComponent
  ],
  templateUrl: '../templates/doctor-alertes-component/doctor-alertes.component.html',
  styleUrls: ['../templates/doctor-alertes-component/doctor-alertes.component.scss']
})
export class DoctorAlertesComponent implements OnInit, OnDestroy {
  patients: DoctorPatient[] = [];
  selectedPatient: DoctorPatient | null = null;
  patientSearchTerm = '';
  alertSearchTerm = '';
  isLoadingPatients = false;

  allAlerts: Alert[] = [];
  isLoadingAlerts = false;
  isLoadingWeather = false;
  isExportingPdf = false;
  currentWeather: WeatherCurrent | null = null;
  errorMessage = '';
  successMessage = '';

  dailyEvolution: DailyData | null = null;
  topAlertTypes: TopAlertType[] = [];
  dailySummary: DailySummary | null = null;
  predictiveAlerts: PredictiveAlert[] = [];

  // KPI metrics
  unresolvedAlerts = 0;
  resolutionRate24h = 0;
  resolutionRateOverall = 0;

  selectedAlertFilter: AlertFilterType = 'all';
  showClinicalNotesPanel = false;
  showChatPanel = false;
  selectedAlertForNotes: Alert | null = null;

  private readonly selectPatientSubject$ = new Subject<DoctorPatient>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly planningService: DoctorPlanningService,
    private readonly alertService: AlertService,
    private readonly authService: AuthService,
    private readonly weatherService: WeatherService
  ) {
    this.selectPatientSubject$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(patient => this.doSelectPatient(patient));
  }

  ngOnInit(): void {
    this.loadPatients();
    this.loadAllAlertsForDoctor();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatients(): void {
    const doctorId = this.authService.getCurrentUser()?.id ?? 1;
    this.isLoadingPatients = true;
    this.errorMessage = '';

    this.planningService.getPatients(doctorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patients: any[]) => {
          this.patients = patients.map(p => this.mapToDoctorPatient(p));
          this.isLoadingPatients = false;

          if (this.patients.length > 0) {
            this.selectPatient(this.patients[0]);
          }
        },
        error: (err) => {
          this.patients = [];
          this.errorMessage = 'Unable to load doctor patients from the server.';
          this.isLoadingPatients = false;
        }
      });
  }

  private loadAllAlertsForDoctor(): void {
    this.isLoadingAlerts = true;
    this.allAlerts = [];

    this.alertService.getAllAlertsForDoctor()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          console.log('[DoctorAlertes] Loaded alerts from backend:', alerts);
          console.log('[DoctorAlertes] Number of alerts:', alerts?.length || 0);
          
          if (alerts && alerts.length > 0) {
            console.log('[DoctorAlertes] First alert sample:', alerts[0]);
            console.log('[DoctorAlertes] Alert properties:', {
              id: alerts[0].id,
              patientId: alerts[0].patientId,
              createdAt: alerts[0].createdAt,
              severity: alerts[0].severity
            });
          }
          
          this.allAlerts = this.sortAlerts(alerts || []);
          this.isLoadingAlerts = false;
          
          // Regenerate chart data after alerts are loaded
          if (this.selectedPatient) {
            console.log('[DoctorAlertes] Regenerating chart after loading alerts');
            this.generateDailyEvolutionData(this.selectedPatient.id);
          }
        },
        error: (err) => {
          console.error('[DoctorAlertes] Error loading alerts:', err);
          console.error('[DoctorAlertes] Error details:', err.message, err.status);
          this.allAlerts = [];
          this.errorMessage = 'Unable to load alerts: ' + (err?.message || 'Unknown error');
          this.isLoadingAlerts = false;
        }
      });
  }

  selectPatient(patient: DoctorPatient): void {
    this.selectPatientSubject$.next(patient);
  }

  private doSelectPatient(patient: DoctorPatient): void {
    this.selectedPatient = patient;
    this.errorMessage = '';
    this.successMessage = '';
    
    console.log('[DoctorAlertes] Patient selected:', patient.firstName, patient.lastName, 'ID:', patient.id);
    console.log('[DoctorAlertes] Current allAlerts count:', this.allAlerts.length);
    
    this.loadWeatherForPatient(patient.id);
    this.loadChartData(patient.id);
    this.loadDailySummary(patient.id);
    this.loadPredictiveAlerts(patient.id); // Generate predictive alerts based on patient's actual alerts
    this.loadDoctorDashboard(patient.id);
    
    // Generate chart data immediately with current alerts
    this.generateDailyEvolutionData(patient.id);
  }

  private loadWeatherForPatient(patientId: number): void {
    this.isLoadingWeather = true;
    this.currentWeather = null;

    console.log('[DoctorAlertes] Chargement de la météo pour Tunis...');
    this.weatherService.getCurrentTunisWeather()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (weather) => {
          console.log('[DoctorAlertes] Météo chargée:', weather);
          this.currentWeather = weather;
          this.isLoadingWeather = false;
        },
        error: (err) => {
          console.error('[DoctorAlertes] Erreur lors du chargement de la météo:', err);
          this.currentWeather = null;
          this.isLoadingWeather = false;
        }
      });
  }

  private loadChartData(patientId: number): void {
    this.generateDailyEvolutionData(patientId);

    this.alertService.getTopAlertTypes(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types: TopAlertType[]) => {
          this.topAlertTypes = types;
        },
        error: () => {
          this.topAlertTypes = [];
        }
      });
  }

  private generateDailyEvolutionData(patientId: number): void {
    const hours: string[] = [];
    const counts: number[] = [];
    
    console.log('[DoctorAlertes] Generating daily evolution for patient ID:', patientId);
    console.log('[DoctorAlertes] Total available alerts:', this.allAlerts.length);
    
    // First, filter all alerts for THIS patient (regardless of date)
    const patientAlerts = this.allAlerts.filter(a => {
      const matches = a.patientId === patientId;
      console.log(`[DoctorAlertes] Alert ID ${a.id}: patientId=${a.patientId}, matches=${matches}`);
      return matches;
    });
    
    console.log('[DoctorAlertes] Alerts for selected patient:', patientAlerts.length);
    
    // If we found patient alerts, use only the last 7 days
    // If not, use ALL alerts (they might not have proper patientId)
    let alertsToProcess = patientAlerts.length > 0 ? patientAlerts : this.allAlerts;
    
    console.log('[DoctorAlertes] Alerts to process:', alertsToProcess.length);
    
    // Group alerts by hour of day (0-23)
    const hourCounts = new Array(24).fill(0);
    
    alertsToProcess.forEach(a => {
      try {
        // Parse date from createdAt (always treat as string or convert)
        const alertDate = new Date(a.createdAt);
        
        // Validate date
        if (!Number.isFinite(alertDate.getTime())) {
          console.warn('[DoctorAlertes] Invalid date for alert:', a.id, a.createdAt);
          return;
        }
        
        const alertHour = alertDate.getHours();
        if (alertHour >= 0 && alertHour < 24) {
          hourCounts[alertHour]++;
          console.log(`[DoctorAlertes] Alert ${a.id} → hour ${alertHour}`);
        }
      } catch (e) {
        console.warn('[DoctorAlertes] Error processing alert:', a.id, e);
      }
    });
    
    // Build the final arrays
    for (let i = 0; i < 24; i++) {
      hours.push(`${String(i).padStart(2, '0')}:00`);
      counts.push(hourCounts[i]);
    }
    
    this.dailyEvolution = {
      hours,
      count: counts
    };
    
    const totalAlerts = counts.reduce((a, b) => a + b, 0);
    const peakHour = counts.indexOf(Math.max(...counts));
    
    console.log('[DoctorAlertes] Daily evolution FINAL DATA:', {
      totalAlerts,
      peakHour: hours[peakHour],
      peakCount: Math.max(...counts, 0),
      allCounts: counts
    });
  }

  private loadDailySummary(patientId: number): void {
    this.alertService.getDailySummary(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary: DailySummary) => {
          this.dailySummary = summary;
        },
        error: () => {
          this.dailySummary = null;
        }
      });
  }

  private loadPredictiveAlerts(patientId: number): void {
    // Generate predictive alerts based on patient's alert patterns
    this.predictiveAlerts = this.generatePredictiveAlertsFromPatternAnalysis(patientId);
    console.log('[DoctorAlertes] Predictive alerts generated:', this.predictiveAlerts);
  }

  private generatePredictiveAlertsFromPatternAnalysis(patientId: number): PredictiveAlert[] {
    // Filter alerts for this patient
    const patientAlerts = this.allAlerts.filter(a => a.patientId === patientId);
    
    if (patientAlerts.length === 0) {
      return [];
    }

    console.log('[DoctorAlertes] Analyzing', patientAlerts.length, 'alerts for patient', patientId);

    const predictiveAlerts: PredictiveAlert[] = [];

    // 1. Analyze forgetting patterns by hour
    const hourCounts = new Array(24).fill(0);
    patientAlerts.forEach(a => {
      try {
        const alertDate = new Date(a.createdAt);
        const hour = alertDate.getHours();
        if (hour >= 0 && hour < 24) {
          hourCounts[hour]++;
        }
      } catch {
        // Ignore invalid dates
      }
    });

    // Find peak hours (hours with most alerts)
    const maxCount = Math.max(...hourCounts);
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count >= maxCount * 0.5) // Hours with at least 50% of peak activity
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Top 3 peak hours

    console.log('[DoctorAlertes] Peak hours analysis:', peakHours);

    // 2. Analyze alert types
    const alertTypeCounts: { [key: string]: number } = {};
    patientAlerts.forEach(a => {
      alertTypeCounts[a.type] = (alertTypeCounts[a.type] || 0) + 1;
    });

    const totalAlerts = patientAlerts.length;

    // 3. Generate predictive alert for medication forgetting
    const medicationAlerts = patientAlerts.filter(a => 
      a.type === 'MEDICATION_MISSED' || a.type === 'REMINDER_MISSED'
    ).length;

    if (medicationAlerts > 0) {
      const forgettingProbability = Math.min(95, Math.round((medicationAlerts / totalAlerts) * 100));
      const riskLevel: 'low' | 'medium' | 'high' = 
        forgettingProbability >= 70 ? 'high' :
        forgettingProbability >= 40 ? 'medium' : 'low';

      predictiveAlerts.push({
        title: 'Medication Forgetting Risk',
        probability: forgettingProbability,
        description: `Patient has ${medicationAlerts} medication reminders missed. Peak risk at ${
          peakHours.length > 0 ? `${String(peakHours[0].hour).padStart(2, '0')}:00` : 'varying times'
        }`,
        riskLevel
      });
    }

    // 4. Generate predictive alert for high-risk time windows
    if (peakHours.length > 0) {
      const topPeakHour = peakHours[0];
      const peakProbability = Math.min(90, Math.round((topPeakHour.count / totalAlerts) * 150)); // Amplified risk

      predictiveAlerts.push({
        title: `High-Risk Time Window: ${String(topPeakHour.hour).padStart(2, '0')}:00`,
        probability: peakProbability,
        description: `${topPeakHour.count} alerts detected at this hour. Recommended: increased monitoring`,
        riskLevel: peakProbability >= 60 ? 'high' : 'medium'
      });
    }

    // 5. Generate predictive alert for caregiver burnout risk
    const caregiverBurnoutAlerts = patientAlerts.filter(a => a.type === 'CAREGIVER_BURNOUT').length;
    if (caregiverBurnoutAlerts > 0) {
      const burnoutProbability = Math.min(80, Math.round((caregiverBurnoutAlerts / totalAlerts) * 120));
      
      predictiveAlerts.push({
        title: 'Caregiver Burnout Risk',
        probability: burnoutProbability,
        description: `${caregiverBurnoutAlerts} burnout indicators detected. Consider support resources`,
        riskLevel: burnoutProbability >= 50 ? 'high' : 'medium'
      });
    }

    console.log('[DoctorAlertes] Generated', predictiveAlerts.length, 'predictive alerts');
    return predictiveAlerts;
  }

  private loadDoctorDashboard(patientId: number): void {
    this.alertService.getDoctorDashboard(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dashboard) => {
          this.unresolvedAlerts = dashboard.unresolvedAlerts;
          this.resolutionRate24h = dashboard.resolutionRate24h;
          this.resolutionRateOverall = dashboard.resolutionRateOverall;
        },
        error: () => {
          this.unresolvedAlerts = 0;
          this.resolutionRate24h = 0;
          this.resolutionRateOverall = 0;
        }
      });
  }

  private sortAlerts(alerts: Alert[]): Alert[] {
    return alerts.sort((a, b) => {
      const weatherPriorityDiff = this.getWeatherPriority(b) - this.getWeatherPriority(a);
      if (weatherPriorityDiff !== 0) return weatherPriorityDiff;

      if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
      if (a.severity !== 'CRITICAL' && b.severity === 'CRITICAL') return 1;

      const severityOrder: Record<AlertSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const severityDiff = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
      if (severityDiff !== 0) return severityDiff;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
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

  weatherIconForAlert(alert: Alert): string {
    const content = `${alert.title || ''} ${alert.description || ''}`.toLowerCase();
    if (content.includes('storm') || content.includes('orage') || content.includes('thunder')) return '⛈️';
    if (content.includes('rain') || content.includes('pluie')) return '🌧️';
    return '☂️';
  }

  private getWeatherPriority(alert: Alert): number {
    if (alert.type !== 'WEATHER') {
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

  private matchesFilter(alert: Alert): boolean {
    switch (this.selectedAlertFilter) {
      case 'all':
        return true;
      case 'critical':
        return alert.severity === 'CRITICAL';
      case 'high':
        return alert.severity === 'HIGH' || alert.severity === 'CRITICAL';
      case 'unresolved':
        return alert.status !== 'RESOLVED';
      default:
        return true;
    }
  }

  applyAlertFilter(filter: AlertFilterType): void {
    this.selectedAlertFilter = filter;
  }

  get filteredAlerts(): Alert[] {
    const term = this.alertSearchTerm.trim().toLowerCase();
    return this.allAlerts.filter((alert) => {
      // Filter by selected patient if one is selected
      if (this.selectedPatient && alert.patientId !== this.selectedPatient.id) {
        return false;
      }
      
      if (!this.matchesFilter(alert)) {
        return false;
      }
      
      if (!term) {
        return true;
      }
      
      return (
        (alert.title || '').toLowerCase().includes(term)
        || (alert.description || '').toLowerCase().includes(term)
      );
    });
  }

  handleAlertAction(action: AlertAction): void {
    const alertAction = action as AlertAction;
    const alert = this.allAlerts.find(a => a.id === alertAction.alertId);
    
    switch (alertAction.action) {
      case 'take-charge':
        this.markAlertInProgress(alertAction.alertId);
        break;
      case 'resolve':
        this.resolveAlert(alertAction.alertId);
        break;
      case 'add-note':
        if (alert) {
          this.openClinicalNotesPanel(alert);
        }
        break;
    }
  }

  openClinicalNotesPanel(alert: Alert): void {
    this.selectedAlertForNotes = alert;
    this.showClinicalNotesPanel = true;
  }

  closeClinicalNotesPanel(): void {
    this.showClinicalNotesPanel = false;
    this.selectedAlertForNotes = null;
  }

  saveClinicalNotes(notes: string): void {
    if (this.selectedAlertForNotes) {
      (this.selectedAlertForNotes as any).clinicalNotes = notes;
      this.closeClinicalNotesPanel();
      this.errorMessage = '';
    }
  }

  openChatPanel(): void {
    this.showChatPanel = true;
  }

  closeChatPanel(): void {
    this.showChatPanel = false;
  }

  exportAlertsToPdf(): void {
    if (!this.selectedPatient) {
      this.errorMessage = 'Please select a patient first.';
      return;
    }

    this.isExportingPdf = true;
    this.errorMessage = '';
    this.successMessage = '';

    const filename = `alerts_${this.selectedPatient.firstName}_${this.selectedPatient.lastName}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Generate PDF client-side
    this.generatePdfExport(this.selectedPatient, this.filteredAlerts, filename);
  }

  private generatePdfExport(patient: DoctorPatient, alerts: Alert[], filename: string): void {
    try {
      // Dynamically import jsPDF
      import('jspdf').then(({ jsPDF }) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        
        // Title
        doc.setFontSize(16);
        doc.setFont('Helvetica', 'bold');
        doc.text('Patient Alerts Report', margin, margin + 5);
        
        // Patient info
        doc.setFontSize(10);
        doc.setFont('Helvetica', 'normal');
        const reportDate = new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        doc.text(`Patient: ${patient.firstName} ${patient.lastName} (ID: ${patient.id})`, margin, margin + 15);
        doc.text(`Report Date: ${reportDate}`, margin, margin + 22);
        doc.text(`Total Alerts: ${alerts.length} | Unresolved: ${this.unresolvedAlerts}`, margin, margin + 29);
        
        // Line separator
        doc.setDrawColor(100);
        doc.line(margin, margin + 35, pageWidth - margin, margin + 35);
        
        let yPos = margin + 45;
        const lineHeight = 7;
        const colWidths = { date: 25, severity: 25, type: 40, title: 50, status: 20 };
        
        // Headers
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        const xDate = margin;
        const xSeverity = xDate + colWidths.date;
        const xType = xSeverity + colWidths.severity;
        const xTitle = xType + colWidths.type;
        const xStatus = xTitle + colWidths.title;
        
        doc.text('Date', xDate, yPos);
        doc.text('Severity', xSeverity, yPos);
        doc.text('Type', xType, yPos);
        doc.text('Title', xTitle, yPos);
        doc.text('Status', xStatus, yPos);
        
        doc.setDrawColor(150);
        doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
        yPos += lineHeight + 2;
        
        // Content
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        
        alerts.forEach(alert => {
          if (yPos > pageHeight - margin - 10) {
            doc.addPage();
            yPos = margin + 10;
          }
          
          const date = new Date(alert.createdAt).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit'
          });
          
          const severityColor = alert.severity === 'CRITICAL' ? [200, 0, 0] : 
                               alert.severity === 'HIGH' ? [200, 100, 0] : [0, 100, 0];
          doc.setTextColor(severityColor[0], severityColor[1], severityColor[2]);
          
          doc.text(date, xDate, yPos);
          doc.text(alert.severity, xSeverity, yPos);
          
          doc.setTextColor(0, 0, 0);
          const typeText = alert.type.replace(/_/g, ' ').substring(0, 12);
          doc.text(typeText, xType, yPos);
          
          // Wrap title text
          const words = alert.title.split(' ');
          let titleLine = '';
          let titleYPos = yPos;
          for (let i = 0; i < words.length; i++) {
            const testLine = titleLine + (titleLine ? ' ' : '') + words[i];
            if (testLine.length > 20) {
              doc.text(titleLine, xTitle, titleYPos);
              titleLine = words[i];
              titleYPos += lineHeight;
            } else {
              titleLine = testLine;
            }
          }
          if (titleLine) {
            doc.text(titleLine, xTitle, titleYPos);
          }
          
          doc.text(alert.status, xStatus, yPos);
          yPos += lineHeight + 2;
        });
        
        // Footer
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`Generated by MemoriA - ${reportDate}`, margin, pageHeight - margin);
        
        // Download
        const pdfBlob = doc.output('blob');
        this.alertService.downloadPdf(pdfBlob, filename);
        this.successMessage = 'PDF exported successfully!';
        this.isExportingPdf = false;
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      }).catch((err) => {
        this.errorMessage = 'Failed to generate PDF. Please try again.';
        console.error('PDF generation error:', err);
        this.isExportingPdf = false;
      });
    } catch (err) {
      this.errorMessage = 'Failed to export PDF. Please try again.';
      console.error('Export error:', err);
      this.isExportingPdf = false;
    }
  }

  private markAlertInProgress(alertId: number): void {
    const index = this.allAlerts.findIndex(a => a.id === alertId);
    if (index === -1) return;

    const previousStatus = this.allAlerts[index].status;
    // Optimistic update
    this.allAlerts[index] = { ...this.allAlerts[index], status: 'IN_PROGRESS' };

    this.alertService.markInProgress(alertId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Success - keep the update
        },
        error: () => {
          // Revert on error
          this.allAlerts[index] = { ...this.allAlerts[index], status: previousStatus };
          this.errorMessage = 'Unable to update alert status.';
        }
      });
  }

  private resolveAlert(alertId: number): void {
    const index = this.allAlerts.findIndex(a => a.id === alertId);
    if (index === -1) return;

    const previousStatus = this.allAlerts[index].status;
    // Optimistic update
    this.allAlerts[index] = { ...this.allAlerts[index], status: 'RESOLVED' };

    this.alertService.resolve(alertId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Success - keep the update
          this.loadDoctorDashboard(this.selectedPatient?.id || 0);
        },
        error: () => {
          // Revert on error
          this.allAlerts[index] = { ...this.allAlerts[index], status: previousStatus };
          this.errorMessage = 'Unable to resolve this alert right now.';
        }
      });
  }

  get filteredPatients(): DoctorPatient[] {
    const query = this.patientSearchTerm.trim().toLowerCase();
    if (!query) return this.patients;
    return this.patients.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(query)
    );
  }

  private mapToDoctorPatient(patient: any): DoctorPatient {
    const firstName = patient.prenom || patient.firstName || '';
    const lastName = patient.nom || patient.lastName || '';
    const adherence = patient.adherence || patient.adherenceRate || 75;
    
    return {
      id: patient.id,
      firstName,
      lastName,
      age: patient.age ?? 65,
      stage: this.mapStage(patient.stage),
      adherence,
      unresolvedAlerts: patient.numberOfAlerts ?? 2,
      initials: this.getInitials(firstName, lastName)
    };
  }

  private mapStage(stage: string | undefined): 'Early' | 'Moderate' | 'Advanced' {
    switch ((stage || '').toUpperCase()) {
      case 'LEGER':
      case 'EARLY':
        return 'Early';
      case 'MODERE':
      case 'MODERATE':
        return 'Moderate';
      default:
        return 'Advanced';
    }
  }

  private getInitials(firstName: string, lastName: string): string {
    const first = (firstName?.[0] ?? '').toUpperCase();
    const last = (lastName?.[0] ?? '').toUpperCase();
    return `${first}${last}` || 'PA';
  }
}

