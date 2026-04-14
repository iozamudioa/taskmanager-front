export type RecurrenceDay = 'LUN' | 'MAR' | 'MIE' | 'JUE' | 'VIE' | 'SAB' | 'DOM';

export const RECURRENCE_DAYS: RecurrenceDay[] = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

export interface CreateTaskRequest {
    houseId: number;
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    durationMinutes?: number;
    recurrenceDays?: RecurrenceDay[];
    pointsReward?: number;
    priority?: number;
    image?: string;
    url?: string;
    color?: string;
    userId?: number;
}

export interface UpdateTaskRequest {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    durationMinutes?: number;
    recurrenceDays?: RecurrenceDay[];
    pointsReward?: number;
    priority?: number;
    image?: string;
    url?: string;
    color?: string;
    userId?: number;
}

export interface TaskResponse {
    id: number;
    houseId: number;
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    durationMinutes?: number;
    recurrenceDays?: string[];
    pointsReward?: number;
    priority?: number;
    image?: string;
    url?: string;
    color?: string;
    assignedTo?: number;
    isActive: boolean;
}

export interface CreateTaskItemRequest {
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    durationMinutes?: number;
    recurrenceDays?: RecurrenceDay[];
    pointsReward?: number;
    priority?: number;
    image?: string;
    url?: string;
    color?: string;
    userId?: number;
}

export interface CreateTasksRequest {
    houseId: number;
    tasks: CreateTaskItemRequest[];
}

export interface CreateTasksResponse {
    totalCreated: number;
    tasks: TaskResponse[];
}

export interface ToggleTaskActiveRequest {
    isActive: boolean;
}

export interface GenerateTasksRequest {
    houseId: number;
    date: string;
}
