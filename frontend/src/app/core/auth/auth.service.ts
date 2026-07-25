import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

export interface LoginCredentials {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly currentUserSignal = signal<User | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'ADMINISTRATOR');
  readonly isManager = computed(() => this.currentUserSignal()?.role === 'MANAGER');

  login(credentials: LoginCredentials): Observable<User> {
    return this.http.post<{ user: User }>(`${this.baseUrl}/login`, credentials).pipe(
      map(({ user }) => user),
      tap((user) => this.currentUserSignal.set(user)),
    );
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`).pipe(
      tap((user) => this.currentUserSignal.set(user)),
      catchError((err) => {
        this.currentUserSignal.set(null);
        return throwError(() => err);
      }),
    );
  }

  refresh(): Observable<User> {
    return this.http.post<{ user: User }>(`${this.baseUrl}/refresh`, {}).pipe(
      map(({ user }) => user),
      tap((user) => this.currentUserSignal.set(user)),
      catchError((err) => {
        this.currentUserSignal.set(null);
        return throwError(() => err);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/logout`, {}).pipe(
      map(() => undefined),
      tap(() => this.currentUserSignal.set(null)),
      catchError((err) => {
        this.currentUserSignal.set(null);
        return throwError(() => err);
      }),
    );
  }

  /** Vide la session côté client sans appel réseau (ex. après échec d'un refresh). */
  clearSession(): void {
    this.currentUserSignal.set(null);
  }

  changePassword(payload: { currentPassword: string; newPassword: string }): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/users/me/password`, payload);
  }
}
