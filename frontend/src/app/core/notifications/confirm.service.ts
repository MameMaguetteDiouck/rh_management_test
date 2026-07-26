import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
}

export type UserDeletionChoice = 'deactivate' | 'delete' | 'cancel';

export interface UserDeletionOptions {
  title: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  readonly userDeletionState = signal<UserDeletionOptions | null>(null);
  private userDeletionResolver: ((value: UserDeletionChoice) => void) | null = null;

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.state.set({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirmer',
      cancelLabel: options.cancelLabel ?? 'Annuler',
      danger: options.danger ?? false,
    });
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  respond(result: boolean): void {
    this.resolver?.(result);
    this.resolver = null;
    this.state.set(null);
  }

  // cas particulier : supprimer un utilisateur supprime aussi ses tâches, donc on
  // propose toujours la désactivation (réversible) comme alternative à côté de la suppression
  chooseUserDeletion(options: UserDeletionOptions): Promise<UserDeletionChoice> {
    this.userDeletionState.set(options);
    return new Promise((resolve) => {
      this.userDeletionResolver = resolve;
    });
  }

  respondUserDeletion(choice: UserDeletionChoice): void {
    this.userDeletionResolver?.(choice);
    this.userDeletionResolver = null;
    this.userDeletionState.set(null);
  }
}
