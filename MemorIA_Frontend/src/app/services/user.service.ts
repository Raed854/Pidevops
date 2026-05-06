import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserPayload, UserResponse } from '../models/user.model';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/api/users`;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  getUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.apiUrl, { headers: this.adminHeaders() });
  }

  createUser(payload: UserPayload): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.apiUrl, payload);
  }

  updateUser(id: number, payload: UserPayload): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.apiUrl}/${id}`, payload, { headers: this.adminHeaders() });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.adminHeaders() });
  }

  confirmUser(id: number): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/${id}/confirm`, {}, { headers: this.adminHeaders() });
  }

  private adminHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Admin-Email': this.authService.getCurrentUserEmail()
    });
  }

  // Community Integration Methods
  search(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.communityApiUrl}/users/search?query=${query}`);
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.communityApiUrl}/users`);
  }

  getByRole(role: string): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.apiUrl}/role/${role}`, { headers: this.adminHeaders() });
  }

  getAccompagnantsLibres(): Observable<UserResponse[]> {
    // Backend has no `libre` filter; return all ACCOMPAGNANT users.
    return this.http.get<UserResponse[]>(`${this.apiUrl}/role/ACCOMPAGNANT`, { headers: this.adminHeaders() });
  }
}

export type { UserResponse };
