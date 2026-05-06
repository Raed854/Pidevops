import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SubscriptionService {
    private api = environment.communityApiUrl;

    constructor(private http: HttpClient) {}

    getStatus(userId: number): Observable<any> {
        return this.http.get<any>(`${this.api}/subscriptions/status?userId=${userId}`);
    }

    processPayment(data: {
        userId: number;
        planType: string;
        cardNumber: string;
        expMonth: number;
        expYear: number;
        cvc: string;
    }): Observable<any> {
        return this.http.post<any>(`${this.api}/payments/process`, data);
    }

    cancel(userId: number): Observable<void> {
        return this.http.post<void>(`${this.api}/subscriptions/cancel?userId=${userId}`, {});
    }

    getAllSubscriptions(): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/subscriptions/all`);
    }

    deleteSubscription(id: number): Observable<void> {
        return this.http.delete<void>(`${this.api}/subscriptions/${id}`);
    }

    getPlans(): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/subscriptions/plans`);
    }
}
