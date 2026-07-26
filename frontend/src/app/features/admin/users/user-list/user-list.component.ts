import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../../core/users/users.service';
import { Role, User } from '../../../../core/models/user.model';
import { ROLE_LABELS } from '../../../../core/models/role-labels';
import { UserFormComponent } from '../user-form/user-form.component';
import { IconComponent } from '../../../../shared/icon/icon.component';
import { PasswordInputComponent } from '../../../../shared/password-input/password-input.component';
import { ToastService } from '../../../../core/notifications/toast.service';
import { ConfirmService } from '../../../../core/notifications/confirm.service';
import { extractErrorMessage } from '../../../../core/http/error-message';
import { AuthService } from '../../../../core/auth/auth.service';

type RoleFilter = Role | 'ALL';

@Component({
  selector: 'app-user-list',
  imports: [RouterLink, FormsModule, UserFormComponent, IconComponent, PasswordInputComponent],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly authService = inject(AuthService);

  protected readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? null);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);

  protected readonly pageSize = 50;
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly roleKeys: Role[] = ['COLLABORATOR', 'MANAGER', 'ADMINISTRATOR'];

  protected readonly editingId = signal<string | null>(null);
  protected readonly resettingId = signal<string | null>(null);
  protected readonly newPassword = signal('');

  protected readonly searchTerm = signal('');
  protected readonly roleFilter = signal<RoleFilter>('ALL');

  protected readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const role = this.roleFilter();
    return this.users().filter((user) => {
      const matchesRole = role === 'ALL' || user.role === role;
      const matchesTerm =
        !term ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      return matchesRole && matchesTerm;
    });
  });

  ngOnInit(): void {
    this.load(1);
  }

  private load(page: number = this.page()): void {
    this.loading.set(true);
    this.usersService.list(page, this.pageSize).subscribe((result) => {
      this.users.set(result.items);
      this.total.set(result.total);
      this.page.set(result.page);
      this.loading.set(false);
    });
  }

  protected nextPage(): void {
    if (this.page() < this.totalPages()) this.load(this.page() + 1);
  }

  protected prevPage(): void {
    if (this.page() > 1) this.load(this.page() - 1);
  }

  protected async deactivate(user: User): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Désactiver ce compte ?',
      message: `${user.firstName} ${user.lastName} ne pourra plus se connecter.`,
      confirmLabel: 'Désactiver',
      danger: true,
    });
    if (!confirmed) return;

    this.usersService.deactivate(user.id).subscribe({
      next: () => {
        this.load();
        this.toastService.warning('Compte désactivé.');
      },
      error: (err: unknown) => this.toastService.error(extractErrorMessage(err)),
    });
  }

  protected async deleteUser(user: User): Promise<void> {
    const choice = await this.confirmService.chooseUserDeletion({
      title: 'Supprimer ce compte ?',
      message: `Toutes les tâches créées par ${user.firstName} ${user.lastName} seront définitivement supprimées avec le compte. Si vous voulez juste l'empêcher de se connecter sans perdre ses données, désactivez-le à la place.`,
    });

    if (choice === 'cancel') return;

    if (choice === 'deactivate') {
      this.usersService.deactivate(user.id).subscribe({
        next: () => {
          this.load();
          this.toastService.warning('Compte désactivé.');
        },
        error: (err: unknown) => this.toastService.error(extractErrorMessage(err)),
      });
      return;
    }

    this.usersService.remove(user.id).subscribe({
      next: () => {
        this.load();
        this.toastService.warning('Compte et tâches associées supprimés.');
      },
      error: (err: unknown) => this.toastService.error(extractErrorMessage(err)),
    });
  }

  protected activate(id: string): void {
    this.usersService.activate(id).subscribe({
      next: () => {
        this.load();
        this.toastService.success('Compte réactivé.');
      },
      error: (err: unknown) => this.toastService.error(extractErrorMessage(err)),
    });
  }

  protected onUserSaved(): void {
    this.editingId.set(null);
    this.load();
  }

  protected confirmResetPassword(id: string): void {
    if (!this.newPassword().trim()) return;
    this.usersService.resetPassword(id, this.newPassword()).subscribe({
      next: () => {
        this.resettingId.set(null);
        this.newPassword.set('');
        this.toastService.success('Mot de passe réinitialisé.');
      },
      error: (err: unknown) => this.toastService.error(extractErrorMessage(err)),
    });
  }
}
