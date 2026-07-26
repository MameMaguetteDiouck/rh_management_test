import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Bloque tout sauf /account tant que l'utilisateur n'a pas changé son mot de passe. */
export const mustChangePasswordGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()?.mustChangePassword) {
    return router.createUrlTree(['/account']);
  }
  return true;
};
