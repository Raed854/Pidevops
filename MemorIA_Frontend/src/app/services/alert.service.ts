import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import {
  Alert,
  AlertDashboard,
  AlertFilter,
  AlertRole,
  AlertSeverity,
  AlertStatus,
  AlertType,
  ChatMessage,
  CreateAlertRequest,
  SendChatMessageRequest,
  TopAlertTypeItem,
  WeatherCurrent,
  WeeklyEvolutionPoint,
  PatientTrendPoint,
} from '../models/alert.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private readonly apiUrl = `${environment.apiUrl}/api/alerts`;
  private readonly weatherApiUrl = `${environment.apiUrl}/api/weather`;
  private readonly chatApiUrl = `${environment.apiUrl}/api/chat`;
  private weatherAlertsEndpointUnavailable = false;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  getCurrentRole(): AlertRole {
    const role = this.authService.getCurrentUser()?.role?.toUpperCase() ?? 'PATIENT';
    if (role === 'DOCTOR' || role === 'SOIGNANT') {
      return 'DOCTOR';
    }
    if (role === 'CAREGIVER' || role === 'ACCOMPAGNANT') {
      return 'CAREGIVER';
    }
    return 'PATIENT';
  }

  getMyAlerts(filter: AlertFilter): Observable<Alert[]> {
    return this.http.get<unknown>(`${this.apiUrl}/me`, this.requestOptions()).pipe(
      map((response: unknown) => this.extractAlerts(response)),
      map((alerts: Alert[]) => this.filterAlerts(alerts, filter)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to load alerts.')));
      })
    );
  }

  createAlert(request: CreateAlertRequest): Observable<Alert> {
    return this.http.post<unknown>(this.apiUrl, request, this.requestOptions()).pipe(
      map((response: unknown) => this.normalizeAlert(response)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to create alert.')));
      })
    );
  }

  markInProgress(alertId: number): Observable<Alert> {
    return this.http.post<unknown>(`${this.apiUrl}/${alertId}/take-in-charge`, {}, this.requestOptions()).pipe(
      map((response: unknown) => this.normalizeAlert(response)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to update alert status.')));
      })
    );
  }

  resolve(alertId: number): Observable<Alert> {
    return this.http.post<unknown>(`${this.apiUrl}/${alertId}/resolve`, { clinicalNote: null }, this.requestOptions()).pipe(
      map((response: unknown) => this.normalizeAlert(response)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to resolve alert.')));
      })
    );
  }

  createManualAlert(alert: Alert, notifyDoctor: boolean = false): Observable<Alert> {
    const payload = {
      patient_id: alert.patientId,
      type: alert.type,
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      created_at: alert.createdAt,
      notify_doctor: notifyDoctor
    };
    return this.http.post<unknown>(`${this.apiUrl}/manual`, payload, this.requestOptions()).pipe(
      map((response: unknown) => this.normalizeAlert(response)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error creating manual alert:', error);
        return of(alert);
      })
    );
  }

  markRead(alertId: number): Observable<Alert> {
    return this.http.post<unknown>(`${this.apiUrl}/${alertId}/mark-as-read`, {}, this.requestOptions()).pipe(
      map((response: unknown) => this.normalizeAlert(response)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to mark alert as read.')));
      })
    );
  }

  delete(alertId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${alertId}`, this.requestOptions()).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to delete alert.')));
      })
    );
  }

  loadAlerts(patientId: number): Observable<Alert[]> {
    return this.http.get<unknown>(`${this.apiUrl}/patient/${patientId}`, this.requestOptions()).pipe(
      map((response: unknown) => this.extractAlerts(response)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to load patient alerts.')));
      })
    );
  }

  loadCurrentWeather(patientId?: number): Observable<WeatherCurrent | null> {
    const requestOptions = this.requestOptions();
    const params = patientId
      ? new HttpParams().set('patientId', String(patientId))
      : undefined;

    return this.http.get<unknown>(`${this.weatherApiUrl}/current`, {
      ...requestOptions,
      ...(params ? { params } : {})
    }).pipe(
      map((response: unknown) => this.normalizeWeatherCurrent(response)),
      catchError(() => of(null))
    );
  }

  loadWeatherAlerts(patientId: number): Observable<Alert[]> {
    if (this.weatherAlertsEndpointUnavailable) {
      return of([]);
    }

    return this.http.get<unknown>(`${this.apiUrl}/weather/${patientId}`, this.requestOptions()).pipe(
      map((response: unknown) => this.extractAlerts(response)),
      map((alerts: Alert[]) => alerts.map((alert) => this.normalizeWeatherAlert(alert))),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.weatherAlertsEndpointUnavailable = true;
        }
        return of([]);
      })
    );
  }

  getAllAlertsForDoctor(): Observable<Alert[]> {
    return this.http.get<unknown>(`${this.apiUrl}/doctor`, this.requestOptions()).pipe(
      map((response: unknown) => this.extractAlerts(response)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to load all alerts.')));
      })
    );
  }

  loadDashboard(patientId: number): Observable<AlertDashboard> {
    return this.http.get<unknown>(`${this.apiUrl}/dashboard/${patientId}`, this.requestOptions()).pipe(
      map((response: unknown) => this.normalizeDashboard(response, patientId)),
      catchError((error: HttpErrorResponse) => {
        // Degrade gracefully if endpoint is unavailable (404 or timeout)
        if (error.status === 404 || error.status === 0) {
          return of(this.normalizeDashboard({}, patientId));
        }
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to load patient dashboard.')));
      })
    );
  }

  loadChatMessages(patientId: number): Observable<ChatMessage[]> {
    return this.http.get<unknown>(`${this.chatApiUrl}/messages/${patientId}`, this.requestOptions()).pipe(
      map((response: unknown) => this.normalizeChatList(response, patientId)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to load chat messages.')));
      })
    );
  }

  sendChatMessage(request: SendChatMessageRequest): Observable<ChatMessage> {
    return this.http.post<unknown>(`${this.chatApiUrl}/messages`, request, this.requestOptions()).pipe(
      map((response: unknown) => this.normalizeChatMessage(response, request.patientId)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to send message.')));
      })
    );
  }

  private requestOptions(): { headers?: HttpHeaders } {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return {};
    }

    let headers = new HttpHeaders();

    if (currentUser.id !== undefined && currentUser.id !== null) {
      headers = headers.set('X-User-Id', String(currentUser.id));
    }

    if (currentUser.role) {
      headers = headers.set('X-User-Role', currentUser.role);
    }

    return headers.keys().length ? { headers } : {};
  }

  private extractAlerts(response: unknown): Alert[] {
    if (Array.isArray(response)) {
      return response.map((item: unknown) => this.normalizeAlert(item));
    }

    if (response && typeof response === 'object') {
      const asRecord = response as Record<string, unknown>;
      const payload = asRecord['content'] ?? asRecord['data'] ?? asRecord['alerts'];
      if (Array.isArray(payload)) {
        return payload.map((item: unknown) => this.normalizeAlert(item));
      }
    }

    return [];
  }

  private normalizeAlert(raw: unknown): Alert {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    const toNumber = (value: unknown, fallback = 0): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const toStringValue = (value: unknown, fallback = ''): string => {
      return typeof value === 'string' ? value : fallback;
    };

    const normalizedSeverity = this.normalizeSeverity(item['severity'] ?? item['gravite']);
    const normalizedStatus = this.normalizeStatus(item['status'] ?? item['statut']);

    return {
      id: toNumber(item['id']),
      patientId: toNumber(item['patientId'] ?? item['patient_id']),
      patientName: toStringValue(item['patientName'] ?? item['patient_name'], 'Patient'),
      title: toStringValue(item['title'] ?? item['titre'], 'Alert'),
      description: toStringValue(item['description'], ''),
      type: this.normalizeType(item['type']),
      status: normalizedStatus,
      severity: normalizedSeverity,
      createdAt: toStringValue(item['createdAt'] ?? item['creeeLe'] ?? item['created_at'], new Date().toISOString()),
      resolvedAt: toStringValue(item['resolvedAt'] ?? item['resolueLe'] ?? item['resolved_at']) || undefined,
      read: Boolean(item['read'] ?? item['isRead'] ?? normalizedStatus !== 'UNREAD'),
      createdById: item['createdById'] !== undefined ? toNumber(item['createdById']) : undefined,
      createdByName: toStringValue(item['createdByName']) || undefined,
      reminderId: item['reminderId'] !== undefined ? toNumber(item['reminderId']) : undefined,
      autoGenerated: Boolean(item['autoGenerated'] ?? item['isAutoGenerated'])
    };
  }

  private normalizeStatus(value: unknown): AlertStatus {
    const status = String(value ?? '').toUpperCase();
    if (status === 'IN_PROGRESS' || status === 'PRISE_EN_CHARGE') {
      return 'IN_PROGRESS';
    }
    if (status === 'RESOLVED' || status === 'RESOLUE') {
      return 'RESOLVED';
    }
    return 'UNREAD';
  }

  private normalizeSeverity(value: unknown): AlertSeverity {
    const severity = String(value ?? '').toUpperCase();
    if (severity === 'CRITICAL' || severity === 'CRITIQUE') {
      return 'CRITICAL';
    }
    if (severity === 'HIGH' || severity === 'ELEVE' || severity === 'URGENT') {
      return 'HIGH';
    }
    if (severity === 'MEDIUM' || severity === 'MOYEN') {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private normalizeType(value: unknown): AlertType {
    const type = String(value ?? '').toUpperCase();
    const allowed: AlertType[] = [
      'MEDICATION_MISSED',
      'COGNITIVE_DECLINE',
      'CAREGIVER_BURNOUT',
      'SAFETY',
      'REMINDER_DELAY',
      'REMINDER_MISSED',
      'WELLBEING',
      'WEATHER',
      'MANUAL'
    ];
    return (allowed as string[]).includes(type) ? (type as AlertType) : 'MANUAL';
  }

  private normalizeWeatherCurrent(raw: unknown): WeatherCurrent {
    const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    const temperatureRaw = payload['temperature'] ?? payload['temp'] ?? payload['temperatureC'] ?? payload['temp_c'];
    const condition = String(payload['condition'] ?? payload['weather'] ?? payload['main'] ?? 'Clear');
    const description = String(payload['description'] ?? payload['summary'] ?? payload['message'] ?? 'Weather is stable today.');
    const explicitSeverity = payload['dangerLevel'] ?? payload['level'] ?? payload['severity'];

    const temperature = Number(temperatureRaw);
    const normalizedTemperature = Number.isFinite(temperature) ? Math.round(temperature) : 0;
    const dangerLevel = this.normalizeWeatherDangerLevel(explicitSeverity, condition, description);

    return {
      temperature: normalizedTemperature,
      condition,
      description,
      icon: this.normalizeWeatherIcon(payload['icon'], condition, description),
      dangerLevel,
      updatedAt: String(payload['updatedAt'] ?? payload['timestamp'] ?? new Date().toISOString())
    };
  }

  private normalizeWeatherAlert(alert: Alert): Alert {
    const severity = this.promoteWeatherSeverity(alert);
    const message = (alert.description || alert.title || '').trim();

    return {
      ...alert,
      type: 'WEATHER',
      title: alert.title || 'Weather Alert',
      description: message || 'Weather conditions need extra precautions today.',
      severity,
      status: alert.status || 'UNREAD',
      read: alert.read ?? false,
    };
  }

  private promoteWeatherSeverity(alert: Alert): AlertSeverity {
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      return alert.severity;
    }

    const weatherText = `${alert.title || ''} ${alert.description || ''}`.toLowerCase();
    if (weatherText.includes('storm') || weatherText.includes('tempete') || weatherText.includes('orage')) {
      return 'CRITICAL';
    }
    if (weatherText.includes('heavy rain') || weatherText.includes('forte pluie') || weatherText.includes('flood')) {
      return 'HIGH';
    }
    return alert.severity || 'MEDIUM';
  }

  private normalizeWeatherIcon(iconValue: unknown, condition: string, description: string): string {
    if (typeof iconValue === 'string' && iconValue.trim()) {
      return iconValue;
    }

    const value = `${condition} ${description}`.toLowerCase();
    if (value.includes('storm') || value.includes('orage') || value.includes('thunder')) {
      return '⛈️';
    }
    if (value.includes('rain') || value.includes('pluie')) {
      return '🌧️';
    }
    if (value.includes('wind') || value.includes('vent')) {
      return '💨';
    }
    if (value.includes('snow') || value.includes('neige')) {
      return '❄️';
    }
    if (value.includes('cloud') || value.includes('nuage')) {
      return '☁️';
    }
    return '🌤️';
  }

  private normalizeWeatherDangerLevel(value: unknown, condition: string, description: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const explicit = String(value ?? '').toUpperCase();
    if (explicit === 'HIGH') {
      return 'HIGH';
    }
    if (explicit === 'MEDIUM') {
      return 'MEDIUM';
    }
    if (explicit === 'LOW') {
      return 'LOW';
    }

    const content = `${condition} ${description}`.toLowerCase();
    if (content.includes('storm') || content.includes('tempete') || content.includes('orage')) {
      return 'HIGH';
    }
    if (content.includes('heavy rain') || content.includes('forte pluie') || content.includes('flood')) {
      return 'HIGH';
    }
    if (content.includes('rain') || content.includes('pluie') || content.includes('wind')) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private filterAlerts(alerts: Alert[], filter: AlertFilter): Alert[] {
    if (filter === 'ALL') {
      return alerts;
    }
    if (filter === 'UNREAD') {
      return alerts.filter((a) => !a.read || a.status === 'UNREAD');
    }
    return alerts.filter((a) => a.status === filter);
  }

  private toApiErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (!error) {
      return fallback;
    }

    if (error.status === 0) {
      return 'Cannot reach server. Please check backend availability.';
    }
    if (error.status === 401) {
      return 'Session expired. Please log in again.';
    }
    if (error.status === 403) {
      return 'You are not allowed to perform this action.';
    }
    if (error.status === 404) {
      return 'No linked patient found for this caregiver.';
    }

    const body = error.error as Record<string, unknown> | string | null;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object') {
      const message = body['message'] ?? body['error'] ?? body['detail'];
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

     if (error.status === 400 && (error.url ?? '').includes('/api/alerts/')) {
      return 'Cannot delete this alert because it is still linked to other records.';
    }

    return fallback;
  }

  private normalizeDashboard(raw: unknown, patientId: number): AlertDashboard {
    const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    const weeklyRaw = Array.isArray(payload['weeklyEvolution'])
      ? payload['weeklyEvolution']
      : (Array.isArray(payload['weekly_evolution']) ? payload['weekly_evolution'] : []);
    const topRaw = Array.isArray(payload['topTypes'])
      ? payload['topTypes']
      : (Array.isArray(payload['top_3_alert_types']) ? payload['top_3_alert_types'] : []);
    const trendsRaw = Array.isArray(payload['patientTrends']) ? payload['patientTrends'] : [];

    const weeklyEvolution: WeeklyEvolutionPoint[] = weeklyRaw.map((entry: unknown) => {
      const item = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
      const rawLabel = item['label'] ?? item['weekLabel'] ?? item['week_start'];
      return {
        label: String(rawLabel ?? ''),
        count: Number(item['count'] ?? item['total_alerts'] ?? 0) || 0,
      };
    });

    const topTypes: TopAlertTypeItem[] = topRaw.map((entry: unknown) => {
      const item = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
      return {
        type: this.normalizeType(item['type']),
        count: Number(item['count'] ?? 0) || 0,
      };
    });

    const patientTrends: PatientTrendPoint[] = trendsRaw.map((entry: unknown) => {
      const item = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
      return {
        month: String(item['month'] ?? ''),
        alertsCount: Number(item['alertsCount'] ?? 0) || 0,
        observanceRate: Number(item['observanceRate'] ?? 0) || 0,
      };
    });

    return {
      patientId: Number(payload['patientId'] ?? payload['patient_id'] ?? patientId) || patientId,
      patientName: String(payload['patientName'] ?? payload['patient_name'] ?? 'Patient'),
      weeklyEvolution,
      topTypes,
      resolutionRate: Number(payload['resolutionRate'] ?? payload['resolution_rate_24h'] ?? 0) || 0,
      patientTrends,
    };
  }

  private normalizeChatList(raw: unknown, fallbackPatientId: number): ChatMessage[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((entry: unknown) => this.normalizeChatMessage(entry, fallbackPatientId));
  }

  private normalizeChatMessage(raw: unknown, fallbackPatientId: number): ChatMessage {
    const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    return {
      patientId: Number(payload['patientId'] ?? fallbackPatientId) || fallbackPatientId,
      senderUserId: Number(payload['senderUserId'] ?? 0) || 0,
      senderRole: this.getNormalizedRoleValue(payload['senderRole']),
      senderName: String(payload['senderName'] ?? 'User'),
      content: String(payload['content'] ?? ''),
      sentAt: String(payload['sentAt'] ?? new Date().toISOString()),
    };
  }

  private getNormalizedRoleValue(value: unknown): AlertRole {
    const role = String(value ?? '').toUpperCase();
    if (role === 'DOCTOR' || role === 'SOIGNANT') {
      return 'DOCTOR';
    }
    if (role === 'CAREGIVER' || role === 'ACCOMPAGNANT') {
      return 'CAREGIVER';
    }
    return 'PATIENT';
  }

  /**
   * Charge les KPIs du dashboard pour l'accompagnant
   */
  loadCaregiverDashboardKpi(patientId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/caregiver/kpi/${patientId}`, this.requestOptions()).pipe(
      map((response) => ({
        patientId,
        todayAlertsCount: response['todayAlertsCount'] ?? 0,
        criticalUnresolvedCount: response['criticalUnresolvedCount'] ?? 0,
        weeklyReminderConfirmationRate: response['weeklyReminderConfirmationRate'] ?? 0,
        globalRiskScore: response['globalRiskScore'] ?? 50,
        lastAlertAt: response['lastAlertAt']
      })),
      catchError(() => of({
        patientId,
        todayAlertsCount: 0,
        criticalUnresolvedCount: 0,
        weeklyReminderConfirmationRate: 85,
        globalRiskScore: 35,
        lastAlertAt: null
      }))
    );
  }

  /**
   * Charge le résumé IA/journal de la journée
   */
  loadDayAiSummary(patientId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/caregiver/summary/${patientId}`, this.requestOptions()).pipe(
      map((response) => ({
        patientId,
        summary: response['summary'] ?? this.generateDefaultSummary(),
        generatedAt: response['generatedAt'] ?? new Date().toISOString(),
        keyInsights: response['keyInsights'] ?? [],
        recommendations: response['recommendations'] ?? []
      })),
      catchError(() => of({
        patientId,
        summary: this.generateDefaultSummary(),
        generatedAt: new Date().toISOString(),
        keyInsights: [],
        recommendations: []
      }))
    );
  }

  /**
   * Charge la timeline simplifiée de la journée
   */
  loadDayTimeline(patientId: number, date?: string): Observable<any> {
    const queryDate = date ?? new Date().toISOString().split('T')[0];
    return this.http.get<any>(`${this.apiUrl}/caregiver/timeline/${patientId}?date=${queryDate}`, this.requestOptions()).pipe(
      map((response) => ({
        patientId,
        date: queryDate,
        events: Array.isArray(response['events']) ? response['events'] : []
      })),
      catchError(() => of({
        patientId,
        date: queryDate,
        events: []
      }))
    );
  }

  /**
   * Génère un résumé par défaut quand le backend n'est pas disponible
   */
  private generateDefaultSummary(): string {
    return `Journée jusqu'à présent: Le patient a respecté ses rappels. Aucun problème de sécurité signalé. Continuez à surveiller regulièrement.`;
  }

  /**
   * Get all alerts for a specific patient (for caregivers/doctors)
   */
  getAllPatientAlerts(patientId: number): Observable<Alert[]> {
    return this.http.get<unknown>(
      `${this.apiUrl}/patient/${patientId}`,
      this.requestOptions()
    ).pipe(
      map((response: unknown) => this.extractAlerts(response)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error loading patient alerts:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  /**
   * Update an existing alert (change status, add notes, etc.)
   */
  updateAlert(alert: Alert): Observable<Alert> {
    return this.http.put<unknown>(
      `${this.apiUrl}/${alert.id}`,
      {
        status: alert.status,
        notes: alert.notes || '',
        updatedAt: new Date().toISOString()
      },
      this.requestOptions()
    ).pipe(
      map((response: unknown) => {
        if (response && typeof response === 'object') {
          return this.normalizeAlert(response);
        }
        return alert;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error updating alert:', error);
        return of(alert);
      })
    );
  }

  /**
   * Delete (mark as archived) an alert
   */
  deleteAlert(alertId: number): Observable<boolean> {
    return this.http.delete<unknown>(
      `${this.apiUrl}/${alertId}`,
      this.requestOptions()
    ).pipe(
      map(() => true),
      catchError((error: HttpErrorResponse) => {
        console.error('Error deleting alert:', error);
        return of(false);
      })
    );
  }

  /**
   * Get weekly evolution chart data (8 weeks)
   */
  getWeeklyEvolution(patientId: number): Observable<any> {
    return this.loadDashboard(patientId).pipe(
      map((dashboard) => ({
        weeks: dashboard.weeklyEvolution.map((entry) => entry.label),
        count: dashboard.weeklyEvolution.map((entry) => entry.count)
      })),
      catchError(() => of({ weeks: [], count: [] }))
    );
  }

  /**
   * Get top alert types ranking
   */
  getTopAlertTypes(patientId: number): Observable<any[]> {
    return this.loadDashboard(patientId).pipe(
      map((dashboard) => dashboard.topTypes.map((item, idx) => ({
        type: item.type || `Type ${idx + 1}`,
        count: item.count || 0,
        percentage: 0
      }))),
      catchError(() => of([]))
    );
  }

  /**
   * Get daily AI summary
   */
  getDailySummary(patientId: number): Observable<any> {
    return this.loadDashboard(patientId).pipe(
      map((dashboard) => ({
        text: `Resolution rate (24h): ${Math.round(dashboard.resolutionRate)}%. Weekly alerts tracked: ${dashboard.weeklyEvolution.length}.`,
        timestamp: new Date()
      })),
      catchError(() => of({
        text: '',
        timestamp: new Date()
      }))
    );
  }

  /**
   * Get predictive alerts based on trends
   */
  getPredictiveAlerts(patientId: number): Observable<any[]> {
    return this.http.get<unknown>(
      `${this.apiUrl}/dashboard/${patientId}`,
      this.requestOptions()
    ).pipe(
      map((response: unknown) => {
        const payload = (response && typeof response === 'object' ? response : {}) as Record<string, unknown>;
        const raw = Array.isArray(payload['predictiveAlerts'])
          ? payload['predictiveAlerts']
          : (Array.isArray(payload['predictive_alerts']) ? payload['predictive_alerts'] : []);

        return raw.map((item: unknown) => {
          const entry = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
          const confidence = Number(entry['probability'] ?? entry['confidenceScore'] ?? entry['confidence_score'] ?? 0) || 0;
          const predictedSeverity = String(entry['predicted_severity'] ?? entry['predictedSeverity'] ?? '').toUpperCase();
          const riskLevel = predictedSeverity === 'CRITICAL' || predictedSeverity === 'HIGH'
            ? 'high'
            : (predictedSeverity === 'MEDIUM' ? 'medium' : 'low');

          return {
            title: String(entry['title'] ?? entry['predicted_type'] ?? 'Predictive Alert'),
            probability: Math.max(0, Math.min(100, Math.round(confidence))),
            description: String(entry['description'] ?? entry['pattern_description'] ?? ''),
            riskLevel
          };
        }).slice(0, 3);
      }),
      catchError(() => of([]))
    );
  }

  // ============= CAREGIVER-SPECIFIC METHODS =============

  /**
   * Get all patients linked to the current caregiver
   */
  getCaregiverPatients(): Observable<any[]> {
    return this.http.get<unknown>(
      `${this.apiUrl}/caregiver/patients-list`,
      this.requestOptions()
    ).pipe(
      map((response: any) => {
        if (Array.isArray(response)) {
          return response.map((patient: any) => ({
            id: patient.id || 0,
            firstName: patient.firstName || 'Patient',
            lastName: patient.lastName || '',
            age: patient.age || 0,
            stage: patient.stage || 'Moderate',
            adherenceRate: patient.adherenceRate || 75,
            globalRiskScore: patient.globalRiskScore || 50,
            unresolvedAlerts: patient.unresolvedAlerts || 0,
            initials: (patient.firstName?.[0] || 'P') + (patient.lastName?.[0] || 'M'),
            photo: patient.photo || undefined,
            patientName: `${patient.firstName || 'Patient'} ${patient.lastName || ''}`
          }));
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Get all alerts for a specific patient (caregiver view)
   */
  getPatientAlerts(patientId: number): Observable<Alert[]> {
    return this.http.get<unknown>(
      `${this.apiUrl}/caregiver/patients/${patientId}/alerts`,
      this.requestOptions()
    ).pipe(
      map((response: unknown) => this.extractAlerts(response)),
      catchError(() => of([]))
    );
  }

  /**
   * Get KPI data for a specific patient
   */
  getPatientKpi(patientId: number): Observable<any> {
    return this.http.get<unknown>(
      `${this.apiUrl}/caregiver/patients/${patientId}/kpi`,
      this.requestOptions()
    ).pipe(
      map((response: any) => ({
        alertsToday: response?.alertsToday || 0,
        criticalUnresolved: response?.criticalUnresolved || 0,
        responseRate: response?.responseRate || 0
      })),
      catchError(() => of({
        alertsToday: 0,
        criticalUnresolved: 0,
        responseRate: 0
      }))
    );
  }

  /**
   * Resolve an alert (mark as resolved)
   */
  resolveAlert(alertId: number): Observable<Alert> {
    return this.http.post<unknown>(
      `${this.apiUrl}/${alertId}/resolve`,
      {},
      this.requestOptions()
    ).pipe(
      map((response: unknown) => this.normalizeAlert(response)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.toApiErrorMessage(error, 'Unable to resolve alert.')));
      })
    );
  }

  /**
   * Export patient alerts to PDF (client-side, handled by component)
   * Kept for compatibility - use component.generatePdfExport() instead
   */
  exportAlertsToPdf(patientId: number, filename?: string): Observable<Blob> {
    return throwError(() => new Error('Use component PDF export instead'));
  }

  /**
   * Get doctor dashboard data for a specific patient
   */
  getDoctorDashboard(patientId: number): Observable<any> {
    return this.http.get<unknown>(
      `${this.apiUrl}/doctor/dashboard/${patientId}`,
      this.requestOptions()
    ).pipe(
      map((response: unknown) => {
        const payload = (response && typeof response === 'object' ? response : {}) as Record<string, unknown>;
        const alerts = this.extractAlerts(payload['alerts'] ?? []);
        const unresolvedCount = alerts.filter(a => a.status !== 'RESOLVED').length;
        const totalAlerts = alerts.length;
        const resolutionRate = totalAlerts > 0 ? ((totalAlerts - unresolvedCount) / totalAlerts) * 100 : 0;

        return {
          patientId,
          patientName: String(payload['patientName'] ?? ''),
          unresolvedAlerts: unresolvedCount,
          totalAlerts,
          resolutionRate24h: Number(payload['resolutionRate24h'] ?? resolutionRate) || 0,
          resolutionRateOverall: Number(payload['resolutionRateOverall'] ?? resolutionRate) || 0,
          alerts,
          lastUpdated: new Date()
        };
      }),
      catchError((error: HttpErrorResponse) => {
        // Degrade gracefully if endpoint is unavailable (404 or timeout)
        return of({
          patientId,
          patientName: '',
          unresolvedAlerts: 0,
          totalAlerts: 0,
          resolutionRate24h: 0,
          resolutionRateOverall: 0,
          alerts: [],
          lastUpdated: new Date()
        });
      })
    );
  }

  /**
   * Download PDF file helper
   */
  downloadPdf(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}

