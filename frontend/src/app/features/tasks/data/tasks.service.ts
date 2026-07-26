import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateTaskPayload, RejectTaskPayload, Task, UpdateTaskPayload } from '../../../core/models/task.model';
import { PaginatedResult } from '../../../core/models/paginated-result';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tasks`;

  list(page = 1, pageSize = 50): Observable<PaginatedResult<Task>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedResult<Task>>(this.baseUrl, { params });
  }

  get(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateTaskPayload): Observable<Task> {
    return this.http.post<Task>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateTaskPayload): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  submit(id: string): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/${id}/submit`, {});
  }

  validate(id: string): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/${id}/validate`, {});
  }

  reject(id: string, payload: RejectTaskPayload): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/${id}/reject`, payload);
  }
}
