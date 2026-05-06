import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ConversationService {
    private api = `${environment.communityApiUrl}/conversations`;

    constructor(private http: HttpClient) { }

    findForUser(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}?userId=${userId}`);
    }

    findArchived(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/archived?userId=${userId}`);
    }

    findBlocked(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/blocked?userId=${userId}`);
    }

    startPrivate(userId: number, otherUserId: number): Observable<any> {
        return this.http.post(`${this.api}/private?userId=${userId}&otherUserId=${otherUserId}`, {});
    }

    createDirect(userId: number, otherUserId: number): Observable<any> {
        return this.startPrivate(userId, otherUserId);
    }

    archive(id: number, userId: number): Observable<any> {
        return this.http.put(`${this.api}/${id}/archive?userId=${userId}`, {});
    }

    unarchive(id: number, userId: number): Observable<any> {
        return this.http.put(`${this.api}/${id}/unarchive?userId=${userId}`, {});
    }

    block(id: number, userId: number): Observable<any> {
        return this.http.put(`${this.api}/${id}/block?userId=${userId}`, {});
    }

    unblock(id: number, userId: number): Observable<any> {
        return this.http.put(`${this.api}/${id}/unblock?userId=${userId}`, {});
    }

    delete(id: number, userId: number): Observable<any> {
        return this.http.delete(`${this.api}/${id}?userId=${userId}`);
    }

    leave(communityId: number, userId: number): Observable<any> {
        return this.http.post(`${environment.communityApiUrl}/communities/${communityId}/leave?userId=${userId}`, {});
    }

    findAllCaregivers(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.communityApiUrl}/communities/caregivers`);
    }
}
