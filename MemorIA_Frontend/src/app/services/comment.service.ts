import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Comment } from '../models/comment.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = `${environment.communityApiUrl}/comments`;

  constructor(private http: HttpClient) {}

  getComments(pubId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/pub/${pubId}`);
  }

  createComment(pubId: number, comment: Comment, parentId?: number): Observable<Comment> {
    let params = new HttpParams();
    if (parentId) {
      params = params.set('parentId', parentId.toString());
    }
    return this.http.post<Comment>(`${this.apiUrl}/pub/${pubId}`, comment, { params });
  }

  updateComment(id: number, comment: Partial<Comment>): Observable<Comment> {
    return this.http.put<Comment>(`${this.apiUrl}/${id}`, comment);
  }

  deleteComment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
