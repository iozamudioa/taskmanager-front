import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DashboardTaskInstanceResponse } from '../../../../core/models/task-instance.model';
import { TaskCardComponent } from '../task-card/task-card.component';

interface TimeSlot {
    time: string;
    hour: number;
    tasks: DashboardTaskInstanceResponse[];
}

@Component({
    selector: 'app-hourly-task-list',
    standalone: true,
    imports: [
        CommonModule,
        TaskCardComponent,
    ],
    templateUrl: './hourly-task-list.component.html',
    styleUrl: './hourly-task-list.component.css',
})
export class HourlyTaskListComponent {
    @Input() tasks: DashboardTaskInstanceResponse[] = [];
    @Input() isAdmin = false;
    @Output() onRefresh = new EventEmitter<void>();

    get timeSlots(): TimeSlot[] {
        const slots: Map<number, TimeSlot> = new Map();

        // Initialize all hours
        for (let h = 0; h < 24; h++) {
            const time = this.formatHour(h);
            slots.set(h, { time, hour: h, tasks: [] });
        }

        // Assign tasks to time slots
        this.tasks.forEach((task) => {
            if (task.startTime) {
                const [hour] = task.startTime.split(':');
                const h = parseInt(hour, 10);
                if (slots.has(h)) {
                    slots.get(h)!.tasks.push(task);
                }
            } else {
                // Tasks without time go to 00:00
                slots.get(0)!.tasks.push(task);
            }
        });

        // Sort tasks by start time within each slot
        slots.forEach((slot) => {
            slot.tasks.sort((a, b) => {
                const aTime = a.startTime || '00:00';
                const bTime = b.startTime || '00:00';
                return aTime.localeCompare(bTime);
            });
        });

        // Filter out empty slots if there are any tasks
        if (this.tasks.length > 0) {
            return Array.from(slots.values()).filter((s) => s.tasks.length > 0);
        }

        return Array.from(slots.values());
    }

    private formatHour(hour: number): string {
        return `${String(hour).padStart(2, '0')}:00`;
    }

    refresh(): void {
        this.onRefresh.emit();
    }

    trackByHour(_: number, slot: TimeSlot): number {
        return slot.hour;
    }

    trackByTask(_: number, task: DashboardTaskInstanceResponse): number {
        return task.id;
    }
}
