import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TasksService } from '../data/tasks.service';
import { Task } from '../../../core/models/task.model';

@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule],
  templateUrl: './task-form.component.html',
})
export class TaskFormComponent implements OnInit {
  readonly taskId = input<string | null>(null);
  readonly saved = output<Task>();

  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(TasksService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: ['', [Validators.required, Validators.minLength(1)]],
  });

  ngOnInit(): void {
    const id = this.taskId();
    if (!id) return;

    this.tasksService.get(id).subscribe((task) => {
      this.form.patchValue({ title: task.title, description: task.description });
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);

    const payload = this.form.getRawValue();
    const id = this.taskId();
    const request = id ? this.tasksService.update(id, payload) : this.tasksService.create(payload);

    request.subscribe({
      next: (task) => {
        this.submitting.set(false);
        this.saved.emit(task);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        const message =
          err instanceof HttpErrorResponse ? (err.error?.message ?? 'Une erreur est survenue.') : 'Une erreur est survenue.';
        this.errorMessage.set(message);
      },
    });
  }
}
