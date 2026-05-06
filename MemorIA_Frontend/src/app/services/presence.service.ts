import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private ws: WebSocket | null = null;
  private onlineUsers$ = new BehaviorSubject<Set<number>>(new Set());
  private heartbeatInterval: any = null;
  private reconnectTimeout: any = null;
  private apiUrl = `${environment.communityApiUrl}/presence`;

  constructor(private http: HttpClient) {}

  connect(userId: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(`ws://${new URL(environment.communityApiUrl).host}/ws/presence?userId=${userId}`);

    this.ws.onopen = () => {
      console.log('Presence WebSocket connected');
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'presence' && data.onlineUsers) {
          this.onlineUsers$.next(new Set(data.onlineUsers));
        }
      } catch (e) {
        // pong or non-JSON
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.reconnectTimeout = setTimeout(() => {
        this.connect(userId);
      }, 5000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getOnlineUsers(): Observable<Set<number>> {
    return this.onlineUsers$.asObservable();
  }

  isUserOnline(userId: number): Observable<boolean> {
    return this.onlineUsers$.pipe(
      map(users => users.has(userId))
    );
  }

  getLastSeen(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/last-seen/${userId}`);
  }
}
