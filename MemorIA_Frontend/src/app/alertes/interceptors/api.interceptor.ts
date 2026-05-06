import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HTTP_INTERCEPTORS
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

/**
 * HTTP Interceptor - gestion des en-têtes d'authentification et erreurs globales.
 */
@Injectable()
export class ApiInterceptor implements HttpInterceptor {

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const preparedReq = this.withAuthHeaders(req);

    return next.handle(preparedReq).pipe(
      retry({
        count: 1,
        delay: (error: HttpErrorResponse) => {
          const isRetriable = error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
          return isRetriable ? timer(1000) : throwError(() => error);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.isAuthEndpoint(req.url)) {
          console.warn('[ApiInterceptor] 401 received - redirecting to login', { url: req.url });
          this.handle401Error();
        }

        if (error.status === 403) {
          console.warn('[ApiInterceptor] Access forbidden (403)', { url: req.url });
        }

        return throwError(() => error);
      })
    );
  }

  private withAuthHeaders(req: HttpRequest<any>): HttpRequest<any> {
    const setHeaders: Record<string, string> = {};

    const currentUser = this.authService.getUser();
    
    if (currentUser?.id) {
      setHeaders['X-User-Id'] = String(currentUser.id);
    }
    if (currentUser?.role) {
      setHeaders['X-User-Role'] = currentUser.role;
    }

    // Ne pas forcer content-type quand FormData.
    if (!(req.body instanceof FormData)) {
      setHeaders['Content-Type'] = 'application/json';
    }

    return Object.keys(setHeaders).length ? req.clone({ setHeaders }) : req;
  }

  private handle401Error(): void {
    console.warn('[ApiInterceptor] Session expired or invalid');
    this.authService.logout();

    // Signal utilisateur global (toast éventuel côté app shell/login).
    const message = 'Session expiree, veuillez vous reconnecter.';
    sessionStorage.setItem('memoria_auth_message', message);
    window.dispatchEvent(new CustomEvent('memoria-toast', {
      detail: { type: 'warning', message }
    }));

    this.router.navigate(['/login'], {
      queryParams: { reason: 'session-expired' }
    }).catch(() => {
      // Eviter un crash si la navigation échoue.
      console.warn('[ApiInterceptor] Redirect to login failed');
    });
  }

  private isAuthEndpoint(url: string): boolean {
    return url.includes('/api/auth/login') || url.includes('/api/auth/signup');
  }
}

export const apiInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: ApiInterceptor,
  multi: true
};
