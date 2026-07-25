import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../data/users.service';
import { User } from '../../../../core/models/user.model';
import { ROLE_LABELS } from '../../../../core/models/role-labels';
import { UserFormComponent } from '../user-form/user-form.component';

@Component({
  selector: 'app-user-list',
  imports: [RouterLink, FormsModule, UserFormComponent],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  private readonly usersService = inject(UsersService);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly editingId = signal<string | null>(null);
  protected readonly resettingId = signal<string | null>(null);
  protected readonly newPassword = signal('');

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
