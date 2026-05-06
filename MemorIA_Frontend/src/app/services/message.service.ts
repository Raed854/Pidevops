import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class MessageService {
    private api = `${environment.communityApiUrl}/messages`;

    constructor(private http: HttpClient) { }

    send(userId: number, conversationId: number, req: { content: string, imageUrl?: string, fileUrl?: string, fileType?: string, tags?: string, forwardedFromMessageId?: number, replyToMessageId?: number }): Observable<any> {
        return this.http.post<any>(`${this.api}?userId=${userId}&conversationId=${conversationId}`, req);
    }

    uploadImage(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${this.api}/upload-image`, formData);
    }

    uploadFile(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${this.api}/upload-file`, formData);
    }

    getByConversation(convId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/conversation/${convId}`);
    }

    delete(id: number, userId: number): Observable<any> {
        return this.http.delete(`${this.api}/${id}?userId=${userId}`);
    }

    update(id: number, userId: number, content: string, tags?: string): Observable<any> {
        return this.http.put(`${this.api}/${id}?userId=${userId}`, { content, tags });
    }

    forward(userId: number, messageId: number, toConversationId: number): Observable<any> {
        return this.http.post(`${this.api}/forward?userId=${userId}&messageId=${messageId}&toConversationId=${toConversationId}`, {});
    }

    search(query: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/search?query=${query}`);
    }

    transcribe(id: number): Observable<any> {
        return this.http.post(`${this.api}/${id}/transcribe`, {});
    }
}
