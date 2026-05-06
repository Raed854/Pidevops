import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Comment } from '../models/comment.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ModerationService {
  private apiUrl = `${environment.communityApiUrl}/moderation/comments`;
  private badWordApiUrl = `${environment.communityApiUrl}/badwords`;

  constructor(private http: HttpClient) { }

  getPendingComments(): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/pending`);
  }

  approveComment(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectComment(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/reject`, {});
  }

  importBadWordsExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.badWordApiUrl}/import`, formData);
  }
}
