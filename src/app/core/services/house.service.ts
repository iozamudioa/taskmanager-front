import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
    AddMemberRequest,
    CreateHouseRequest,
    HouseMemberResponse,
    HouseResponse,
    JoinHouseRequest,
    UpdateMemberRoleRequest,
} from '../models/house.model';

@Injectable({ providedIn: 'root' })
export class HouseService {
    private http = inject(HttpClient);

    getAllHouses(): Observable<HouseResponse[]> {
        return this.http.get<HouseResponse[]>(`${API_BASE_URL}/houses`);
    }

    getHouse(houseId: number): Observable<HouseResponse> {
        return this.http.get<HouseResponse>(`${API_BASE_URL}/houses/${houseId}`);
    }

    createHouse(request: CreateHouseRequest): Observable<HouseResponse> {
        return this.http.post<HouseResponse>(`${API_BASE_URL}/houses`, request);
    }

    joinHouse(request: JoinHouseRequest): Observable<HouseMemberResponse> {
        return this.http.post<HouseMemberResponse>(`${API_BASE_URL}/houses/join`, request);
    }

    getMembers(houseId: number): Observable<HouseMemberResponse[]> {
        return this.http.get<HouseMemberResponse[]>(`${API_BASE_URL}/houses/${houseId}/members`);
    }

    addMember(houseId: number, request: AddMemberRequest): Observable<HouseMemberResponse> {
        return this.http.post<HouseMemberResponse>(`${API_BASE_URL}/houses/${houseId}/members`, request);
    }

    updateMemberRole(
        houseId: number,
        userId: number,
        request: UpdateMemberRoleRequest
    ): Observable<HouseMemberResponse> {
        return this.http.patch<HouseMemberResponse>(
            `${API_BASE_URL}/houses/${houseId}/members/${userId}/role`,
            request
        );
    }
}
