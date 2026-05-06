import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
  role: string;
  nom: string;
  prenom: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/api/users/login`;
  private storageKey = 'memoria_user';

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<User> {
    return this.http.post<User>(this.apiUrl, { email, password }).pipe(
      tap(user => {
        localStorage.setItem(this.storageKey, JSON.stringify(user));
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/users/logout`, {}).pipe(
      tap(() => {
        localStorage.removeItem(this.storageKey);
        this.router.navigate(['/home']);
      })
    );
  }

  getUser(): User | null {
    const data = localStorage.getItem(this.storageKey);
    if (!data) return null;
    return JSON.parse(data) as User;
  }

  isLoggedIn(): boolean {
    return this.getUser() !== null;
  }

  getRole(): string | null {
    return this.getUser()?.role ?? null;
  }
}
