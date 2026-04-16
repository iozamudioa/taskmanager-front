import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
    AddMemberRequest,
    CreateHouseRequest,
    HouseMemberResponse,
    HouseResponse,
    JoinHouseRequest,
    UpdateMemberRoleRequest,
} from '../models/house.model';
import {
    AssignTaskInstanceRequest,
    CompleteTaskInstanceRequest,
    DashboardResponse,
    DashboardTaskInstanceResponse,
    TaskInstanceResponse,
} from '../models/task-instance.model';
import {
    CreateTaskRequest,
    CreateTasksRequest,
    CreateTasksResponse,
    GenerateTasksRequest,
    TaskResponse,
    ToggleTaskActiveRequest,
    UpdateTaskRequest,
} from '../models/task.model';
import { CreateUserRequest, UpdateUserImageRequest, UpdateUserRequest, UserResponse } from '../models/user.model';

const API_BASE = 'http://api.taskmanager.home';

export interface HouseUserResponse extends HouseMemberResponse {
    user: UserResponse;
}

export interface DashboardPointsResponse {
    houseId: number;
    userId: number;
    date: string;
    todayPoints: number;
    monthPoints: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
    private http = inject(HttpClient);

    createUser(request: CreateUserRequest): Observable<UserResponse> {
        return this.http
            .post<UserResponse>(`${API_BASE}/users`, request)
            .pipe(map((user) => this.normalizeUser(user)));
    }

    getUser(userId: number): Observable<UserResponse> {
        return this.http
            .get<UserResponse>(`${API_BASE}/users/${userId}`)
            .pipe(map((user) => this.normalizeUser(user)));
    }

    updateUser(userId: number, request: UpdateUserRequest): Observable<UserResponse> {
        return this.http
            .put<UserResponse>(`${API_BASE}/users/${userId}`, request)
            .pipe(map((user) => this.normalizeUser(user)));
    }

    updateUserImage(userId: number, request: UpdateUserImageRequest): Observable<UserResponse> {
        return this.http
            .patch<UserResponse>(`${API_BASE}/users/${userId}/image`, request)
            .pipe(map((user) => this.normalizeUser(user)));
    }

    getAllHouses(): Observable<HouseResponse[]> {
        return this.http.get<HouseResponse[]>(`${API_BASE}/houses`);
    }

    getHouse(houseId: number): Observable<HouseResponse> {
        return this.http.get<HouseResponse>(`${API_BASE}/houses/${houseId}`);
    }

    createHouse(request: CreateHouseRequest): Observable<HouseResponse> {
        return this.http.post<HouseResponse>(`${API_BASE}/houses`, request);
    }

    joinHouse(request: JoinHouseRequest): Observable<HouseMemberResponse> {
        return this.http.post<HouseMemberResponse>(`${API_BASE}/houses/join`, request);
    }

    getMembers(houseId: number): Observable<HouseMemberResponse[]> {
        return this.http.get<HouseMemberResponse[]>(`${API_BASE}/houses/${houseId}/members`);
    }

    addMember(houseId: number, request: AddMemberRequest): Observable<HouseMemberResponse> {
        return this.http.post<HouseMemberResponse>(`${API_BASE}/houses/${houseId}/members`, request);
    }

    updateMemberRole(
        houseId: number,
        userId: number,
        request: UpdateMemberRoleRequest
    ): Observable<HouseMemberResponse> {
        return this.http.patch<HouseMemberResponse>(
            `${API_BASE}/houses/${houseId}/members/${userId}/role`,
            request
        );
    }

    deleteMember(houseId: number, userId: number): Observable<void> {
        return this.http.delete<void>(
            `${API_BASE}/houses/${houseId}/members/${userId}`
        );
    }

    searchUsers(username: string): Observable<UserResponse[]> {
        const params = new HttpParams().set('username', username);
        return this.http
            .get<UserResponse[]>(`${API_BASE}/users/search`, { params })
            .pipe(map((users) => users.map((user) => this.normalizeUser(user))));
    }

    getHouseUsers(houseId: number): Observable<HouseUserResponse[]> {
        return this.getMembers(houseId).pipe(
            switchMap((members) => {
                if (!members.length) {
                    return of([]);
                }

                return forkJoin(
                    members.map((member) =>
                        this.getUser(member.userId).pipe(
                            map((user) => ({
                                ...member,
                                user,
                            }))
                        )
                    )
                );
            })
        );
    }

    getTask(taskId: number): Observable<TaskResponse> {
        return this.http
            .get<TaskResponse>(`${API_BASE}/tasks/${taskId}`)
            .pipe(map((task) => this.normalizeTask(task)));
    }

    createTask(request: CreateTaskRequest): Observable<TaskResponse> {
        return this.http
            .post<TaskResponse>(`${API_BASE}/tasks`, request)
            .pipe(map((task) => this.normalizeTask(task)));
    }

    updateTask(taskId: number, request: UpdateTaskRequest): Observable<TaskResponse> {
        return this.http
            .put<TaskResponse>(`${API_BASE}/tasks/${taskId}`, request)
            .pipe(map((task) => this.normalizeTask(task)));
    }

    deleteTask(taskId: number): Observable<void> {
        return this.http.delete<void>(`${API_BASE}/tasks/${taskId}`);
    }

    toggleTaskActive(taskId: number, request: ToggleTaskActiveRequest): Observable<TaskResponse> {
        return this.http
            .patch<TaskResponse>(`${API_BASE}/tasks/${taskId}/active`, request)
            .pipe(map((task) => this.normalizeTask(task)));
    }

    createTasks(request: CreateTasksRequest): Observable<CreateTasksResponse> {
        return this.http.post<CreateTasksResponse>(`${API_BASE}/tasks/batch`, request).pipe(
            map((response) => ({
                ...response,
                tasks: response.tasks.map((task) => this.normalizeTask(task)),
            }))
        );
    }

    generateTaskInstances(request: GenerateTasksRequest): Observable<TaskInstanceResponse[]> {
        return this.http.post<TaskInstanceResponse[]>(`${API_BASE}/tasks/generate`, request);
    }

    getHouseTasks(houseId: number, date?: string): Observable<TaskInstanceResponse[]> {
        let params = new HttpParams();
        if (date) {
            params = params.set('date', date);
        }
        return this.http.get<TaskInstanceResponse[]>(`${API_BASE}/houses/${houseId}/tasks`, { params });
    }

    getTodayTasks(houseId: number): Observable<TaskInstanceResponse[]> {
        return this.http.get<TaskInstanceResponse[]>(`${API_BASE}/houses/${houseId}/tasks/today`);
    }

    completeTaskInstance(
        taskInstanceId: number,
        request: CompleteTaskInstanceRequest
    ): Observable<TaskInstanceResponse> {
        return this.http.post<TaskInstanceResponse>(
            `${API_BASE}/task-instances/${taskInstanceId}/complete`,
            request
        );
    }

    uncompleteTaskInstance(taskInstanceId: number): Observable<TaskInstanceResponse> {
        return this.http.post<TaskInstanceResponse>(
            `${API_BASE}/task-instances/${taskInstanceId}/uncomplete`,
            {}
        );
    }

    assignTaskInstance(
        taskInstanceId: number,
        request: AssignTaskInstanceRequest
    ): Observable<TaskInstanceResponse> {
        return this.http.patch<TaskInstanceResponse>(
            `${API_BASE}/task-instances/${taskInstanceId}/assign`,
            request
        );
    }

    getDashboard(houseId: number, userId?: number, date?: string): Observable<DashboardResponse> {
        let params = new HttpParams().set('houseId', houseId.toString());
        if (userId !== undefined) {
            params = params.set('userId', userId.toString());
        }
        if (date) {
            params = params.set('date', date);
        }
        return this.http
            .get<DashboardResponse>(`${API_BASE}/dashboard`, { params })
            .pipe(map((dashboard) => this.normalizeDashboard(dashboard)));
    }

    getDashboardPoints(houseId: number, userId: number): Observable<DashboardPointsResponse> {
        const params = new HttpParams()
            .set('houseId', houseId.toString())
            .set('userId', userId.toString());

        return this.http.get<DashboardPointsResponse>(`${API_BASE}/dashboard/points`, { params });
    }

    private normalizeDashboard(dashboard: DashboardResponse): DashboardResponse {
        return {
            ...dashboard,
            todayInstances: dashboard.todayInstances.map((task) => this.normalizeDashboardTask(task)),
        };
    }

    private normalizeDashboardTask(task: DashboardTaskInstanceResponse): DashboardTaskInstanceResponse {
        return {
            ...task,
            image: this.normalizeImageUrl(task.image),
        };
    }

    private normalizeTask(task: TaskResponse): TaskResponse {
        return {
            ...task,
            image: this.normalizeImageUrl(task.image),
        };
    }

    private normalizeUser(user: UserResponse): UserResponse {
        return {
            ...user,
            image: this.normalizeImageUrl(user.image),
        };
    }

    private normalizeImageUrl(image?: string): string | undefined {
        if (!image?.trim()) {
            return undefined;
        }

        const trimmed = image.trim();

        if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) {
            return trimmed;
        }

        if (trimmed.startsWith('/images/')) {
            return `${API_BASE}${trimmed}`;
        }

        if (trimmed.startsWith('images/')) {
            return `${API_BASE}/${trimmed}`;
        }

        if (trimmed.startsWith('/')) {
            return `${API_BASE}/images${trimmed}`;
        }

        return `${API_BASE}/images/${trimmed}`;
    }
}
