import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { DashboardTaskInstanceResponse } from '../../../../core/models/task-instance.model';
import { ApiService } from '../../../../core/services/api.service';

@Component({
    selector: 'app-task-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './task-card.component.html',
    styleUrl: './task-card.component.css',
})
export class TaskCardComponent {
    @Input() task!: DashboardTaskInstanceResponse;
    @Input() isAdmin = false;
    @Output() onCompleted = new EventEmitter<void>();

    private api = inject(ApiService);

    loading = signal(false);

    get formattedTime(): string {
        const time = this.task.startTime || '—';
        const duration = this.task.durationMinutes ? ` (+${this.task.durationMinutes}min)` : '';
        return `${time}${duration}`;
    }

    toggleComplete(): void {
        if (this.loading()) return;

        this.loading.set(true);

        if (this.task.completed) {
            this.api.uncompleteTaskInstance(this.task.id).subscribe({
                next: () => {
                    this.loading.set(false);
                    this.onCompleted.emit();
                },
                error: () => {
                    this.loading.set(false);
                },
            });
        } else {
            this.api.completeTaskInstance(this.task.id, { userId: this.task.assignedTo || 0 }).subscribe({
                next: () => {
                    this.loading.set(false);
                    this.onCompleted.emit();
                },
                error: () => {
                    this.loading.set(false);
                },
            });
        }
    }

    getBackgroundColor(): { backgroundColor: string } {
        if (this.task.color) {
            return { backgroundColor: this.task.color };
        }
        // Default gradient if no color
        return { backgroundColor: '#ede9fe' };
    }
}
