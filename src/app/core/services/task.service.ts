import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
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

@Injectable({ providedIn: 'root' })
export class TaskService {
    private http = inject(HttpClient);

    getTask(taskId: number): Observable<TaskResponse> {
        return this.http.get<TaskResponse>(`${API_BASE_URL}/tasks/${taskId}`);
    }

    createTask(request: CreateTaskRequest): Observable<TaskResponse> {
        return this.http.post<TaskResponse>(`${API_BASE_URL}/tasks`, request);
    }

    updateTask(taskId: number, request: UpdateTaskRequest): Observable<TaskResponse> {
        return this.http.put<TaskResponse>(`${API_BASE_URL}/tasks/${taskId}`, request);
    }

    toggleActive(taskId: number, request: ToggleTaskActiveRequest): Observable<TaskResponse> {
        return this.http.patch<TaskResponse>(`${API_BASE_URL}/tasks/${taskId}/active`, request);
    }

    createTasks(request: CreateTasksRequest): Observable<CreateTasksResponse> {
        return this.http.post<CreateTasksResponse>(`${API_BASE_URL}/tasks/batch`, request);
    }

    generateInstances(request: GenerateTasksRequest): Observable<TaskInstanceResponse[]> {
        return this.http.post<TaskInstanceResponse[]>(`${API_BASE_URL}/tasks/generate`, request);
    }

    getHouseTasks(houseId: number, date?: string): Observable<TaskInstanceResponse[]> {
        let params = new HttpParams();
        if (date) params = params.set('date', date);
        return this.http.get<TaskInstanceResponse[]>(`${API_BASE_URL}/houses/${houseId}/tasks`, { params });
    }

    getTodayTasks(houseId: number): Observable<TaskInstanceResponse[]> {
        return this.http.get<TaskInstanceResponse[]>(`${API_BASE_URL}/houses/${houseId}/tasks/today`);
    }
}

