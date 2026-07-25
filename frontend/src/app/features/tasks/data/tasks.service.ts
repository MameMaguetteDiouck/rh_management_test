import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateTaskPayload, RejectTaskPayload, Task, UpdateTaskPayload } from '../../../core/models/task.model';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tasks`;

  list(): Observable<Task[]> {
    return this.http.get<Task[]>(this.baseUrl);
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
