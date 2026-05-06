import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, Subject, tap } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';
import { Activity, Session, UserSubscription } from '../models/activity.model';
import { Client, Message } from '@stomp/stompjs';
import * as SockJS_ from 'sockjs-client';
const SockJS = (SockJS_ as any).default || SockJS_;
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private apiUrl = `${environment.apiUrl}/api/activites`;
  private sessionUrl = `${environment.apiUrl}/api/seances`;
  private subUrl = `${environment.apiUrl}/api/abonnements`;
  private reservationUrl = `${environment.apiUrl}/api/reservations`;

  // WebSocket
  private stompClient!: Client;
  private calendarUpdatesSubject = new Subject<void>();
  public calendarUpdates$ = this.calendarUpdatesSubject.asObservable();
  
  // MOCK FALLBACK DATA (If DB is empty or unreachable)
  private ACTIVITIES_KEY = 'memoria_activities_mock';
  private SESSIONS_KEY = 'memoria_sessions_mock';
  private SUBSCRIPTIONS_KEY = 'memoria_user_subscriptions_mock';

  constructor(private http: HttpClient) {
    try {
      this.initWebSocket();
    } catch (e) {
      console.error('Error initializing WebSocket in ActivityService:', e);
    }
  }

  private initWebSocket() {
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`),
      debug: (str) => console.log('STOMP: ' + str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = (frame) => {
      console.log('Connected to WebSocket');
      this.stompClient.subscribe('/topic/calendrier', (message: Message) => {
        this.calendarUpdatesSubject.next();
      });
    };
    this.stompClient.activate();
  }

  // --- Real Database API Calls ---

  // 1. Activities
  getAllActivities(): Observable<Activity[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(data => data.map(act => this.mapActiviteToActivity(act))),
      catchError(() => {
        const data = JSON.parse(localStorage.getItem(this.ACTIVITIES_KEY) || '[]');
        return of(data);
      })
    );
  }

  getDoctorActivities(doctorId: number): Observable<Activity[]> {
    return this.http.get<any[]>(`${this.apiUrl}/soignant/${doctorId}`).pipe(
      map(data => data.map(act => this.mapActiviteToActivity(act))),
      catchError(() => {
        const data = JSON.parse(localStorage.getItem(this.ACTIVITIES_KEY) || '[]');
        return of(data.filter((a: any) => a.doctorId === doctorId));
      })
    );
  }

  createActivity(activity: Activity): Observable<Activity> {
    const payload = {
      titre: activity.title,
      description: activity.description,
      type: activity.type,
      image: activity.mediaUrl,
      doctor: { id: activity.doctorId }
    };
    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(act => this.mapActiviteToActivity(act)),
      catchError(() => {
        const data = JSON.parse(localStorage.getItem(this.ACTIVITIES_KEY) || '[]');
        activity.id = Math.floor(Math.random() * 10000);
        activity.createdAt = new Date().toISOString();
        data.push(activity);
        localStorage.setItem(this.ACTIVITIES_KEY, JSON.stringify(data));
        return of(activity);
      })
    );
  }

  private mapActiviteToActivity(act: any): Activity {
    return {
      id: act.id,
      title: act.titre,
      description: act.description,
      type: act.type,
      mediaUrl: act.image,
      doctorId: act.doctor?.id,
      doctorName: act.doctor ? `${act.doctor.prenom} ${act.doctor.nom}` : 'Dr. Inconnu',
      createdAt: act.id ? new Date().toISOString() : undefined
    };
  }

  updateActivity(id: number, activity: Activity): Observable<Activity> {
    return this.http.put<Activity>(`${this.apiUrl}/${id}`, activity).pipe(
      catchError(() => {
        let data = JSON.parse(localStorage.getItem(this.ACTIVITIES_KEY) || '[]');
        data = data.map((a: any) => a.id === id ? { ...a, ...activity } : a);
        localStorage.setItem(this.ACTIVITIES_KEY, JSON.stringify(data));
        return of(activity);
      })
    );
  }

  deleteActivity(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        let data = JSON.parse(localStorage.getItem(this.ACTIVITIES_KEY) || '[]');
        data = data.filter((a: any) => a.id !== id);
        localStorage.setItem(this.ACTIVITIES_KEY, JSON.stringify(data));
        return of(undefined);
      })
    );
  }

  // 2. Media Upload (Functional)
  uploadMedia(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData).pipe(
      catchError(() => {
        const hash = file.name.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
        const mockUrl = `https://picsum.photos/seed/${Math.abs(hash)}/800/600`;
        return of({ mediaUrl: mockUrl, mediaType: file.type, fileName: file.name }).pipe(delay(800));
      })
    );
  }

  // 3. Sessions (Real API - Mapped to Seance)
  getAllSessions(): Observable<Session[]> {
    return this.http.get<any[]>(this.sessionUrl).pipe(
      map(data => data.map(s => this.mapSeanceToSession(s))),
      catchError(() => {
        const data = JSON.parse(localStorage.getItem(this.SESSIONS_KEY) || '[]');
        return of(data);
      })
    );
  }

  createSession(session: Session): Observable<Session> {
    const payload = {
      dateDebut: session.startTime,
      dateFin: session.endTime,
      statut: 'DISPONIBLE',
      activite: { id: session.activityId }
    };
    return this.http.post<any>(this.sessionUrl, payload).pipe(
      map(s => this.mapSeanceToSession(s)),
      catchError(() => {
        const data = JSON.parse(localStorage.getItem(this.SESSIONS_KEY) || '[]');
        session.id = Math.floor(Math.random() * 10000);
        data.push(session);
        localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(data));
        return of(session);
      })
    );
  }

  private mapSeanceToSession(s: any): Session {
    return {
      id: s.id,
      activityId: s.activite?.id,
      activityTitle: s.activite?.titre,
      startTime: s.dateDebut,
      endTime: s.dateFin,
      status: s.statut, // DISPONIBLE, RESERVE, ANNULE
      // On backend, user info comes from reservations, so this requires reservation fetching if booking details are needed
    };
  }

  bookSession(sessionId: number, userId: number, userName: string, subscription?: string, sessionsCount?: number): Observable<Session> {
    // Appel au backend de la vraie réservation
    return this.http.post<any>(`${this.reservationUrl}`, {
      accompagnantId: userId,
      seanceId: sessionId
    }).pipe(
      map(res => {
        let s = res.seance;
        return this.mapSeanceToSession(s);
      }),
      catchError((err) => {
        if(err.status === 400) throw new Error(err.error);
        
        let data = JSON.parse(localStorage.getItem(this.SESSIONS_KEY) || '[]');
        let session = data.find((s: Session) => s.id === sessionId);
        if (session) {
          session.status = 'BOOKED';
          session.userId = userId;
          session.userName = userName;
          localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(data));
          return of(session);
        }
        throw new Error('Session not found');
      })
    );
  }

  acceptSession(sessionId: number): Observable<Session> {
    // Le vrai backend gère l'acceptation sur Reservation, il faut donc l'ID de la réservation. 
    // Pour l'intégration, on peut utiliser un endpoint Seance personnalisé ou adapter
    return this.http.put<any>(`${this.sessionUrl}/${sessionId}/status?nouveauStatut=DISPONIBLE`, {}).pipe(
      map(s => this.mapSeanceToSession(s)),
      catchError(() => {
        let data = JSON.parse(localStorage.getItem(this.SESSIONS_KEY) || '[]');
        let session = data.find((s: Session) => s.id === sessionId);
        if (session) {
          session.status = 'APPROVED';
          localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(data));
          return of(session);
        }
        throw new Error('Session not found');
      })
    );
  }

  cancelSession(sessionId: number): Observable<Session> {
    return this.http.put<any>(`${this.sessionUrl}/${sessionId}/status?nouveauStatut=ANNULE`, {}).pipe(
      map(s => this.mapSeanceToSession(s)),
      catchError(() => {
        let data = JSON.parse(localStorage.getItem(this.SESSIONS_KEY) || '[]');
        let session = data.find((s: Session) => s.id === sessionId);
        if (session) {
          session.status = 'AVAILABLE';
          session.userId = undefined;
          session.userName = undefined;
          localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(data));
          return of(session);
        }
        throw new Error('Session not found');
      })
    );
  }

  // 4. Subscriptions (Real API)
  // 4. Subscriptions (Mapped to Abonnement)
  addUserSubscription(sub: UserSubscription): Observable<UserSubscription> {
    const payload = {
      accompagnantId: sub.userId,
      forfaitType: sub.planName.includes('4') ? 'PACK_4' : (sub.planName.includes('15') ? 'PACK_15' : 'PACK_50'),
      seancesTotal: sub.sessionsTotal,
      seancesRestantes: sub.sessionsTotal
    };
    return this.http.post<any>(`${this.subUrl}/creer`, payload).pipe(
      map(res => this.mapAbonnementToUserSub(res)),
      catchError(() => {
        const data = JSON.parse(localStorage.getItem(this.SUBSCRIPTIONS_KEY) || '[]');
        sub.id = Math.floor(Math.random() * 10000);
        data.push(sub);
        localStorage.setItem(this.SUBSCRIPTIONS_KEY, JSON.stringify(data));
        return of(sub);
      })
    );
  }

  private mapAbonnementToUserSub(sub: any): UserSubscription {
    return {
      id: sub.id,
      userId: sub.accompagnantId,
      userName: "Accompagnant",
      planName: sub.forfaitType,
      sessionsTotal: sub.seancesTotal,
      sessionsUsed: sub.seancesTotal - sub.seancesRestantes,
      purchaseDate: sub.dateAchat || new Date().toISOString()
    };
  }

  getUserSubscriptions(): Observable<UserSubscription[]> {
    return this.http.get<any[]>(this.subUrl).pipe(
      map(res => res.map(a => this.mapAbonnementToUserSub(a))),
      catchError(() => {
        const data = JSON.parse(localStorage.getItem(this.SUBSCRIPTIONS_KEY) || '[]');
        return of(data);
      })
    );
  }

  getSubscriptionByUserId(userId: number): Observable<UserSubscription | undefined> {
    return this.http.get<any>(`${this.subUrl}/actif/${userId}`).pipe(
      map(res => res ? this.mapAbonnementToUserSub(res) : undefined),
      catchError(() => {
        const data = JSON.parse(localStorage.getItem(this.SUBSCRIPTIONS_KEY) || '[]');
        return of(data.find((s: any) => s.userId === userId));
      })
    );
  }

  incrementSessionsUsed(userId: number): Observable<UserSubscription> {
    return this.http.put<any>(`${this.subUrl}/incrementer/${userId}`, {}).pipe(
      map(res => this.mapAbonnementToUserSub(res)),
      catchError(() => {
        const data = JSON.parse(localStorage.getItem(this.SUBSCRIPTIONS_KEY) || '[]');
        let sub = data.find((s: any) => s.userId === userId);
        if (sub) {
          sub.sessionsUsed = (sub.sessionsUsed || 0) + 1;
          localStorage.setItem(this.SUBSCRIPTIONS_KEY, JSON.stringify(data));
          return of(sub);
        }
        throw new Error('Subscription not found');
      })
    );
  }


}
