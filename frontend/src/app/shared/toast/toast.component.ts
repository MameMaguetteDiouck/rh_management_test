import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../core/notifications/toast.service';
import { IconComponent, IconName } from '../icon/icon.component';

interface ToastStyle {
  container: string;
  badge: string;
  icon: IconName;
  label: string;
}

const TOAST_STYLES: Record<ToastType, ToastStyle> = {
  success: {
    container: 'border-brand-600 bg-brand-50 text-brand-900',
    badge: 'bg-brand-600 text-white',
    icon: 'check',
    label: 'Succès',
  },
  error: {
    container: 'border-red-600 bg-red-50 text-red-900',
    badge: 'bg-red-600 text-white',
    icon: 'alert-circle',
    label: 'Erreur',
  },
  warning: {
    container: 'border-amber-500 bg-amber-50 text-amber-900',
    badge: 'bg-amber-500 text-white',
    icon: 'alert-circle',
    label: 'Attention',
  },
  info: {
    container: 'border-blue-600 bg-blue-50 text-blue-900',
    badge: 'bg-blue-600 text-white',
    icon: 'info',
    label: 'Info',
  },
};

@Component({
  selector: 'app-toast',
  imports: [IconComponent],
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3 px-4"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-l-4 p-4 shadow-xl ring-1 ring-black/5"
          [class]="styles(toast.type).container"
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            [class]="styles(toast.type).badge"
          >
            <app-icon [name]="styles(toast.type).icon" class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1 pt-0.5">
            <p class="text-sm font-bold uppercase tracking-wide">{{ styles(toast.type).label }}</p>
            <p class="mt-0.5 text-sm font-medium text-slate-700">{{ toast.message }}</p>
          </div>
          <button
            type="button"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Fermer"
            class="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <app-icon name="x" class="h-4 w-4" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  protected styles(type: ToastType): ToastStyle {
    return TOAST_STYLES[type];
  }
}
