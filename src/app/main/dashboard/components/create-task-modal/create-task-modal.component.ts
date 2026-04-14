import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HouseMemberResponse } from '../../../../core/models/house.model';
import { CreateTaskRequest } from '../../../../core/models/task.model';
import { ApiService } from '../../../../core/services/api.service';
import { AppStateService } from '../../../../core/state/app-state.service';

@Component({
    selector: 'app-create-task-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './create-task-modal.component.html',
    styleUrl: './create-task-modal.component.css',
})
export class CreateTaskModalComponent {
    @Input() isAdmin = false;
    @Input() members: HouseMemberResponse[] = [];
    @Input() currentUserId = 0;
    @Output() onClose = new EventEmitter<void>();

    private api = inject(ApiService);
    private state = inject(AppStateService);

    form: CreateTaskRequest = {
        houseId: 0,
        title: '',
        description: '',
        startTime: '08:00',
        durationMinutes: 30,
        pointsReward: 10,
        priority: 2,
        color: '#ede9fe',
        userId: 0,
    };

    loading = signal(false);
    error = signal('');

    constructor() {
        const house = this.state.currentHouse();
        if (house) {
            this.form.houseId = house.id;
        }
        if (!this.isAdmin) {
            this.form.userId = this.currentUserId;
        }
    }

    submit(): void {
        if (!this.form.title.trim()) {
            this.error.set('El título de la tarea es obligatorio.');
            return;
        }

        this.loading.set(true);
        this.error.set('');

        this.api.createTask(this.form).subscribe({
            next: () => {
                this.loading.set(false);
                this.close();
            },
            error: () => {
                this.loading.set(false);
                this.error.set('No se pudo crear la tarea. Intenta de nuevo.');
            },
        });
    }

    close(): void {
        this.onClose.emit();
    }

    get colors() {
        return [
            '#ede9fe',
            '#dbeafe',
            '#dcfce7',
            '#fef3c7',
            '#fed7aa',
            '#fee2e2',
            '#f3e8ff',
        ];
    }
}
