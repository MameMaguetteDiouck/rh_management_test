import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../core/notifications/confirm.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-confirm-dialog',
  imports: [IconComponent],
  template: `
    @if (confirmService.state(); as state) {
      <div
        class="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-4"
        (click)="cancel()"
      >
        <div
          class="animate-toast-in w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
          (click)="$event.stopPropagation()"
        >
          <span
            class="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            [class]="state.danger ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'"
          >
            <app-icon [name]="state.danger ? 'trash' : 'alert-circle'" class="h-6 w-6" />
          </span>
          <h2 class="mt-4 text-base font-semibold text-slate-900">{{ state.title }}</h2>
          @if (state.message) {
            <p class="mt-2 text-sm text-slate-500">{{ state.message }}</p>
          }
          <div class="mt-6 flex gap-3">
            <button
              type="button"
              (click)="cancel()"
              class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {{ state.cancelLabel }}
            </button>
            <button
              type="button"
              (click)="confirm()"
              class="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white"
              [class]="state.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'"
            >
              {{ state.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (confirmService.userDeletionState(); as state) {
      <div
        class="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-4"
        (click)="cancelUserDeletion()"
      >
        <div
          class="animate-toast-in w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
          (click)="$event.stopPropagation()"
        >
          <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <app-icon name="alert-circle" class="h-6 w-6" />
          </span>
          <h2 class="mt-4 text-base font-semibold text-slate-900">{{ state.title }}</h2>
          @if (state.message) {
            <p class="mt-2 text-sm text-slate-500">{{ state.message }}</p>
          }
          <div class="mt-6 flex flex-col gap-2">
            <button
              type="button"
              (click)="respondUserDeletion('delete')"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Supprimer définitivement
            </button>
            <button
              type="button"
              (click)="respondUserDeletion('deactivate')"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Désactiver plutôt
            </button>
            <button
              type="button"
              (click)="respondUserDeletion('cancel')"
              class="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirmService = inject(ConfirmService);

  protected confirm(): void {
    this.confirmService.respond(true);
  }

  protected cancel(): void {
    this.confirmService.respond(false);
  }

  protected respondUserDeletion(choice: 'deactivate' | 'delete' | 'cancel'): void {
    this.confirmService.respondUserDeletion(choice);
  }

  protected cancelUserDeletion(): void {
    this.confirmService.respondUserDeletion('cancel');
  }
}
