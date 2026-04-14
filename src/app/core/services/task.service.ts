import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TaskInstanceResponse } from '../models/task-instance.model';
import {
    CreateTaskRequest,
    CreateTasksRequest,
    CreateTasksResponse,
    GenerateTasksRequest,
    TaskResponse,
    ToggleTaskActiveRequest,
    UpdateTaskRequest,
} from '../models/task.model';

const API_BASE = 'http://api.taskmanager.home';

@Injectable({ providedIn: 'root' })
export class TaskService {
    private http = inject(HttpClient);

    getTask(taskId: number): Observable<TaskResponse> {
        return this.http.get<TaskResponse>(`${API_BASE}/tasks/${taskId}`);
    }

    createTask(request: CreateTaskRequest): Observable<TaskResponse> {
        return this.http.post<TaskResponse>(`${API_BASE}/tasks`, request);
    }

    updateTask(taskId: number, request: UpdateTaskRequest): Observable<TaskResponse> {
        return this.http.put<TaskResponse>(`${API_BASE}/tasks/${taskId}`, request);
    }

    toggleActive(taskId: number, request: ToggleTaskActiveRequest): Observable<TaskResponse> {
        return this.http.patch<TaskResponse>(`${API_BASE}/tasks/${taskId}/active`, request);
    }

    createTasks(request: CreateTasksRequest): Observable<CreateTasksResponse> {
        return this.http.post<CreateTasksResponse>(`${API_BASE}/tasks/batch`, request);
    }

    generateInstances(request: GenerateTasksRequest): Observable<TaskInstanceResponse[]> {
        return this.http.post<TaskInstanceResponse[]>(`${API_BASE}/tasks/generate`, request);
    }

    getHouseTasks(houseId: number, date?: string): Observable<TaskInstanceResponse[]> {
        let params = new HttpParams();
        if (date) params = params.set('date', date);
        return this.http.get<TaskInstanceResponse[]>(`${API_BASE}/houses/${houseId}/tasks`, { params });
    }

    getTodayTasks(houseId: number): Observable<TaskInstanceResponse[]> {
        return this.http.get<TaskInstanceResponse[]>(`${API_BASE}/houses/${houseId}/tasks/today`);
    }
}
