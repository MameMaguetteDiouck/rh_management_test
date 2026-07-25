import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Route racine '' sous ShellComponent : redirige vers l'écran d'atterrissage propre à chaque rôle. */
export const landingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.currentUser()?.role;
  const target = role === 'ADMINISTRATOR' ? '/admin' : '/tasks';
  return router.createUrlTree([target]);
};
