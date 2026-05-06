import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import * as SockJS_ from 'sockjs-client';
const SockJS = (SockJS_ as any).default || SockJS_;
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private client!: Client;
  private messageSubject = new Subject<string>();

  public messages$ = this.messageSubject.asObservable();

  constructor() {
    try {
      this.initWebSocket();
    } catch (e) {
      console.error('Error initializing WebSocket in WebsocketService:', e);
    }
  }

  public subscribe(topic: string, callback: (message: any) => void) {
    if (this.client && this.client.connected) {
      this.client.subscribe(topic, (message: Message) => {
        try {
          const body = JSON.parse(message.body);
          callback(body);
        } catch (e) {
          callback(message.body);
        }
      });
    } else {
      // Si pas encore connecté, on attend la connexion
      setTimeout(() => this.subscribe(topic, callback), 1000);
    }
  }

  private initWebSocket() {
    this.client = new Client({
      // Use SockJS for compatibility
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str: string) => {
        // console.log(str);
      }
    });

    this.client.onConnect = (frame: any) => {
      console.log('Connecté au WebSocket STOMP');
      
      this.client.subscribe('/topic/seances', (message: Message) => {
        this.messageSubject.next('UPDATE_SEANCES');
      });

      this.client.subscribe('/topic/reservations', (message: Message) => {
        this.messageSubject.next(message.body);
      });

      this.client.subscribe('/topic/activites', (message: Message) => {
        this.messageSubject.next(message.body);
      });
    };

    this.client.onStompError = (frame: any) => {
      console.error('STOMP error: ' + frame.headers['message']);
    };

    this.client.activate();
  }
}

