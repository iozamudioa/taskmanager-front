import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { HouseMemberResponse, HouseResponse } from '../models/house.model';
import { UserResponse } from '../models/user.model';

const STORAGE_KEY_USER = 'tm_current_user';
const STORAGE_KEY_HOUSE = 'tm_current_house';
const STORAGE_KEY_MEMBERS = 'tm_house_members';

@Injectable({ providedIn: 'root' })
export class AppStateService {
    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);

    private _currentUser = signal<UserResponse | null>(this.loadFromStorage<UserResponse>(STORAGE_KEY_USER));
    private _currentHouse = signal<HouseResponse | null>(this.loadFromStorage<HouseResponse>(STORAGE_KEY_HOUSE));
    private _houseMembers = signal<HouseMemberResponse[]>(this.loadFromStorage<HouseMemberResponse[]>(STORAGE_KEY_MEMBERS) ?? []);

    readonly currentUser = this._currentUser.asReadonly();
    readonly currentHouse = this._currentHouse.asReadonly();
    readonly houseMembers = this._houseMembers.asReadonly();

    readonly isOnboarded = computed(() => !!this._currentUser() && !!this._currentHouse());

    setCurrentUser(user: UserResponse | null): void {
        this._currentUser.set(user);
        this.saveToStorage(STORAGE_KEY_USER, user);
    }

    setCurrentHouse(house: HouseResponse | null): void {
        this._currentHouse.set(house);
        this.saveToStorage(STORAGE_KEY_HOUSE, house);
        if (!house) {
            this._houseMembers.set([]);
            this.saveToStorage(STORAGE_KEY_MEMBERS, []);
        }
    }

    setHouseMembers(members: HouseMemberResponse[]): void {
        this._houseMembers.set(members);
        this.saveToStorage(STORAGE_KEY_MEMBERS, members);
    }

    clearAll(): void {
        this._currentUser.set(null);
        this._currentHouse.set(null);
        this._houseMembers.set([]);
        if (this.isBrowser) {
            localStorage.removeItem(STORAGE_KEY_USER);
            localStorage.removeItem(STORAGE_KEY_HOUSE);
            localStorage.removeItem(STORAGE_KEY_MEMBERS);
        }
    }

    private loadFromStorage<T>(key: string): T | null {
        if (!this.isBrowser) return null;
        try {
            const raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    }

    private saveToStorage<T>(key: string, value: T | null): void {
        if (!this.isBrowser) return;
        if (value === null) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }
}
