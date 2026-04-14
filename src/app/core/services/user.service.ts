import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateUserRequest, UserResponse } from '../models/user.model';

const API_BASE = 'http://api.taskmanager.home';

@Injectable({ providedIn: 'root' })
export class UserService {
    private http = inject(HttpClient);

    createUser(request: CreateUserRequest): Observable<UserResponse> {
        return this.http.post<UserResponse>(`${API_BASE}/users`, request);
    }

    getUser(userId: number): Observable<UserResponse> {
        return this.http.get<UserResponse>(`${API_BASE}/users/${userId}`);
    }
}
