import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CreateUserPayload, UpdateUserPayload, User } from '../../../../core/models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  list(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl);
  }

  create(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateUserPayload): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}`, payload);
  }

  deactivate(id: string): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  activate(id: string): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}/activate`, {});
  }

  resetPassword(id: string, newPassword: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/password`, { newPassword });
  }
}
