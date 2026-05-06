import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const roleGuard = (requiredRole: 'PATIENT' | 'SOIGNANT' | 'ACCOMPAGNANT'): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
      return router.createUrlTree(['/login']);
    }
    if (currentUser.role.toUpperCase() !== requiredRole) {
      return router.createUrlTree(['/home']);
    }
    return true;
  };
};
