export interface TaskInstanceResponse {
    id: number;
    taskId: number;
    scheduledDate: string;
    assignedTo?: number;
    completed: boolean;
    completedAt?: string;
}

export interface CompleteTaskInstanceRequest {
    userId: number;
}

export interface AssignTaskInstanceRequest {
    userId: number;
}

export interface DashboardTaskInstanceResponse {
    id: number;
    taskId: number;
    scheduledDate: string;
    assignedTo?: number;
    completed: boolean;
    completedAt?: string;
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    durationMinutes?: number;
    startTime?: string;
    recurrenceDays?: string[];
    pointsReward?: number;
    priority?: number;
    image?: string;
    url?: string;
    color?: string;
}

export interface DashboardResponse {
    houseId: number;
    userId?: number;
    pendingTasks: number;
    completedTasks: number;
    todayInstances: DashboardTaskInstanceResponse[];
}
