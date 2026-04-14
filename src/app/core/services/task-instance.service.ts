import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
    AssignTaskInstanceRequest,
    CompleteTaskInstanceRequest,
    DashboardResponse,
    TaskInstanceResponse,
} from '../models/task-instance.model';

const API_BASE = 'http://api.taskmanager.home';

@Injectable({ providedIn: 'root' })
export class TaskInstanceService {
    private http = inject(HttpClient);

    complete(
        taskInstanceId: number,
        request: CompleteTaskInstanceRequest
    ): Observable<TaskInstanceResponse> {
        return this.http.post<TaskInstanceResponse>(
            `${API_BASE}/task-instances/${taskInstanceId}/complete`,
            request
        );
    }

    uncomplete(taskInstanceId: number): Observable<TaskInstanceResponse> {
        return this.http.post<TaskInstanceResponse>(
            `${API_BASE}/task-instances/${taskInstanceId}/uncomplete`,
            {}
        );
    }

    assign(
        taskInstanceId: number,
        request: AssignTaskInstanceRequest
    ): Observable<TaskInstanceResponse> {
        return this.http.patch<TaskInstanceResponse>(
            `${API_BASE}/task-instances/${taskInstanceId}/assign`,
            request
        );
    }

    getDashboard(houseId: number, userId?: number): Observable<DashboardResponse> {
        let params = new HttpParams().set('houseId', houseId.toString());
        if (userId !== undefined) params = params.set('userId', userId.toString());
        return this.http.get<DashboardResponse>(`${API_BASE}/dashboard`, { params });
    }
}
