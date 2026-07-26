import { Component, input } from '@angular/core';

export type IconName =
  | 'menu'
  | 'chevron-left'
  | 'chevron-down'
  | 'chevron-up'
  | 'search'
  | 'plus'
  | 'pencil'
  | 'trash'
  | 'x'
  | 'logout'
  | 'tasks'
  | 'shield'
  | 'user'
  | 'eye'
  | 'eye-off'
  | 'mail'
  | 'lock'
  | 'check'
  | 'alert-circle'
  | 'info';

@Component({
  selector: 'app-icon',
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg
      class="h-full w-full"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @switch (name()) {
        @case ('menu') {
          <path d="M4 6h16M4 12h16M4 18h16" />
        }
        @case ('chevron-left') {
          <path d="M15 18l-6-6 6-6" />
        }
        @case ('chevron-down') {
          <path d="M6 9l6 6 6-6" />
        }
        @case ('chevron-up') {
          <path d="M18 15l-6-6-6 6" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('pencil') {
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        }
        @case ('trash') {
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        }
        @case ('x') {
          <path d="M18 6L6 18M6 6l12 12" />
        }
        @case ('logout') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        }
        @case ('tasks') {
          <rect x="6" y="4" width="12" height="16" rx="2" />
          <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
          <path d="M9 13l2 2 4-4" />
        }
        @case ('shield') {
          <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4Z" />
        }
        @case ('user') {
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
        }
        @case ('eye') {
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('eye-off') {
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
          <path d="M3 3l18 18" />
        }
        @case ('mail') {
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        }
        @case ('lock') {
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M7 10V7a5 5 0 0 1 10 0v3" />
        }
        @case ('check') {
          <path d="M20 6L9 17l-5-5" />
        }
        @case ('alert-circle') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01" />
          <path d="M12 12v4" />
        }
      }
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
}
