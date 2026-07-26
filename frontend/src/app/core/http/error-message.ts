import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return err.error?.message ?? 'Une erreur est survenue.';
  }
  return 'Une erreur est survenue.';
}
