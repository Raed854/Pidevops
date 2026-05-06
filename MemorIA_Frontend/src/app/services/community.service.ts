import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CommunityService {
    private api = `${environment.communityApiUrl}/communities`;

    constructor(private http: HttpClient) { }

    create(community: any, userId: number): Observable<any> {
        return this.http.post(`${this.api}?userId=${userId}`, community);
    }

    findAll(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}?userId=${userId}`);
    }

    findUserGroups(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/my-groups?userId=${userId}`);
    }

    join(id: number, userId: number): Observable<any> {
        return this.http.post(`${this.api}/${id}/join?userId=${userId}`, {});
    }

    leave(id: number, userId: number): Observable<any> {
        return this.http.post(`${this.api}/${id}/leave?userId=${userId}`, {});
    }

    addMember(communityId: number, memberId: number, creatorId: number): Observable<any> {
        return this.http.post(`${this.api}/${communityId}/add-member?memberId=${memberId}&creatorId=${creatorId}`, {});
    }

    removeMember(communityId: number, memberId: number, creatorId: number): Observable<any> {
        return this.http.post(`${this.api}/${communityId}/remove-member?memberId=${memberId}&creatorId=${creatorId}`, {});
    }

    update(id: number, community: any, userId: number): Observable<any> {
        return this.http.put(`${this.api}/${id}?userId=${userId}`, community);
    }

    search(query: string, userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/search?query=${query}&userId=${userId}`);
    }

    delete(id: number, userId: number): Observable<any> {
        return this.http.delete(`${this.api}/${id}?userId=${userId}`);
    }

    archive(id: number, userId: number): Observable<any> {
        return this.http.put(`${this.api}/${id}/archive?userId=${userId}`, {});
    }

    unarchive(id: number, userId: number): Observable<any> {
        return this.http.put(`${this.api}/${id}/unarchive?userId=${userId}`, {});
    }

    getStats(): Observable<any> {
        return this.http.get(`${this.api}/stats`);
    }

    getCaregivers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/caregivers`);
    }

    getAllUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.communityApiUrl}/users`);
    }
}
