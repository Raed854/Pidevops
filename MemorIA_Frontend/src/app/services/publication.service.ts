import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Publication } from '../models/publication.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PublicationService {
  private apiUrl = `${environment.communityApiUrl}/publications`;

  constructor(private http: HttpClient) {}

  getAllPublications(): Observable<Publication[]> {
    return this.http.get<Publication[]>(this.apiUrl);
  }

  getDoctorPublications(doctorId: number): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.apiUrl}/doctor/${doctorId}`);
  }

  createPublication(publication: Publication): Observable<Publication> {
    return this.http.post<Publication>(this.apiUrl, publication);
  }

  updatePublication(id: number, publication: Publication): Observable<Publication> {
    return this.http.put<Publication>(`${this.apiUrl}/${id}`, publication);
  }

  deletePublication(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadMedia(file: File): Observable<{mediaUrl: string, mediaType: string, fileName: string}> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{mediaUrl: string, mediaType: string, fileName: string}>(`${this.apiUrl}/upload-media`, formData);
  }
}
