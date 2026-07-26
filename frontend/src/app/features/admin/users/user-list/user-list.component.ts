import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../../core/users/users.service';
import { Role, User } from '../../../../core/models/user.model';
import { ROLE_LABELS } from '../../../../core/models/role-labels';
import { UserFormComponent } from '../user-form/user-form.component';
import { IconComponent } from '../../../../shared/icon/icon.component';
import { PasswordInputComponent } from '../../../../shared/password-input/password-input.component';

type RoleFilter = Role | 'ALL';

@Component({
  selector: 'app-user-list',
  imports: [RouterLink, FormsModule, UserFormComponent, IconComponent, PasswordInputComponent],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  private readonly usersService = inject(UsersService);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
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
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.usersService.list().subscribe((users) => {
      this.users.set(users);
      this.loading.set(false);
    });
  }

  protected deactivate(id: string): void {
    this.usersService.deactivate(id).subscribe(() => this.load());
  }

  protected activate(id: string): void {
    this.usersService.activate(id).subscribe(() => this.load());
  }

  protected onUserSaved(): void {
    this.editingId.set(null);
    this.load();
  }

  protected confirmResetPassword(id: string): void {
    if (!this.newPassword().trim()) return;
    this.usersService.resetPassword(id, this.newPassword()).subscribe(() => {
      this.resettingId.set(null);
      this.newPassword.set('');
    });
  }
}
