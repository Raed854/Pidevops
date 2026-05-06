import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AppNotification {
    id: number;
    recipientId: number;
    recipientRole: string;
    type: 'SCORE_ALERTE' | 'TEST_COMPLETED' | 'TEST_EXPIRY' | 'DECISION_PENDING' | 'TEST_ASSIGNED' | 'TEST_STARTED';
    title: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    read: boolean;
    createdAt: string;
    actionUrl: string;
    patientId?: number;
    patientName?: string;
    zScore?: number;
    extraData?: string;
}

/** Toast UI simple affiché en haut à droite de l'écran */
export interface ToastMessage {
    message: string;
    type: 'success' | 'error' | 'info';
    id: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/notifications`;

    // ─── Toast UI léger (sans dépendance externe) ─────────────────
    toasts = signal<ToastMessage[]>([]);
    private toastCounter = 0;

    showSuccess(message: string, durationMs = 3500): void {
        this._addToast(message, 'success', durationMs);
    }

    showError(message: string, durationMs = 5000): void {
        this._addToast(message, 'error', durationMs);
    }

    showInfo(message: string, durationMs = 3500): void {
        this._addToast(message, 'info', durationMs);
    }

    private _addToast(message: string, type: ToastMessage['type'], durationMs: number): void {
        const id = ++this.toastCounter;
        this.toasts.update(ts => [...ts, { message, type, id }]);
        setTimeout(() => {
            this.toasts.update(ts => ts.filter(t => t.id !== id));
        }, durationMs);
    }

    dismissToast(id: number): void {
        this.toasts.update(ts => ts.filter(t => t.id !== id));
    }

    getUnread(recipientId: number): Observable<AppNotification[]> {
        return this.http.get<AppNotification[]>(`${this.apiUrl}/unread/${recipientId}`);
    }

    getAll(recipientId: number): Observable<AppNotification[]> {
        return this.http.get<AppNotification[]>(`${this.apiUrl}/all/${recipientId}`);
    }

    countUnread(recipientId: number): Observable<{ count: number }> {
        return this.http.get<{ count: number }>(`${this.apiUrl}/count/${recipientId}`);
    }

    markRead(notifId: number): Observable<AppNotification> {
        return this.http.patch<AppNotification>(`${this.apiUrl}/${notifId}/read`, {});
    }

    markAllRead(recipientId: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/mark-all-read/${recipientId}`, {});
    }

    /** Polling toutes les 30s pour maintenir le compteur à jour */
    pollUnread(recipientId: number): Observable<AppNotification[]> {
        return interval(30_000).pipe(
            startWith(0),
            switchMap(() => this.getAll(recipientId))
        );
    }

    /** Retourne l'icône selon le type */
    getIcon(type: string): string {
        switch (type) {
            case 'SCORE_ALERTE':     return '⚠';
            case 'TEST_COMPLETED':   return '✓';
            case 'TEST_EXPIRY':      return '⏰';
            case 'DECISION_PENDING': return '📋';
            case 'TEST_ASSIGNED':    return '📝';
            case 'TEST_STARTED':     return '▶';
            default:                 return '🔔';
        }
    }

    /** Retourne le libellé du type */
    getTypeLabel(type: string): string {
        switch (type) {
            case 'SCORE_ALERTE':     return 'Alerte cognitive';
            case 'TEST_COMPLETED':   return 'Test complété';
            case 'TEST_EXPIRY':      return 'Test expiré';
            case 'DECISION_PENDING': return 'Décision en attente';
            case 'TEST_ASSIGNED':    return 'Nouveau test assigné';
            case 'TEST_STARTED':     return 'Test démarré';
            default:                 return 'Notification';
        }
    }
}
