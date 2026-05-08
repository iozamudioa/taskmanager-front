import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CreateUserRequest, UserResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
    private http = inject(HttpClient);

    createUser(request: CreateUserRequest): Observable<UserResponse> {
        return this.http.post<UserResponse>(`${API_BASE_URL}/users`, request);
    }

    getUser(userId: number): Observable<UserResponse> {
        return this.http.get<UserResponse>(`${API_BASE_URL}/users/${userId}`);
    }
}

