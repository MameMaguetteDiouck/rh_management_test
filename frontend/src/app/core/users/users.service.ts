import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateUserPayload, UpdateUserPayload, User } from '../models/user.model';
import { PaginatedResult } from '../models/paginated-result';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  list(page = 1, pageSize = 50): Observable<PaginatedResult<User>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedResult<User>>(this.baseUrl, { params });
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

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
