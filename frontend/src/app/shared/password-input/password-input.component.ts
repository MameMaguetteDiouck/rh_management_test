import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-password-input',
  imports: [IconComponent],
  host: { class: 'relative block' },
  template: `
    <app-icon
      name="lock"
      class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
    />
    <input
      [id]="id()"
      [type]="visible() ? 'text' : 'password'"
      [autocomplete]="autocomplete()"
      [value]="value"
      (input)="onInput($event)"
      (blur)="onTouched()"
      class="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
    />
    <button
      type="button"
      (click)="visible.set(!visible())"
      [attr.aria-label]="visible() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
      class="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600"
    >
      <app-icon [name]="visible() ? 'eye-off' : 'eye'" class="h-4 w-4" />
    </button>
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PasswordInputComponent), multi: true },
  ],
})
export class PasswordInputComponent implements ControlValueAccessor {
  readonly id = input('');
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');

  protected readonly visible = signal(false);
  protected value = '';

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  protected onInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
}
