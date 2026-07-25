import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from '../models/user.model';

/** À placer après `authGuard` dans `canActivate` : suppose que `currentUser` est déjà hydraté. */
export const roleGuard = (...allowedRoles: Role[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const role = authService.currentUser()?.role;
    if (role && allowedRoles.includes(role)) {
      return true;
    }
    return router.createUrlTree(['/']);
  };
};
