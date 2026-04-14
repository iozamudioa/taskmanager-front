import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, shareReplay, startWith, Subject, switchMap } from 'rxjs';
import { HouseMemberResponse } from '../../../core/models/house.model';
import { ApiService, HouseUserResponse } from '../../../core/services/api.service';
import { AppStateService } from '../../../core/state/app-state.service';

interface SelectUserViewModel {
    users: HouseUserResponse[];
    loading: boolean;
    error: string;
}

@Component({
    selector: 'app-select-user',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './select-user.component.html',
    styleUrl: './select-user.component.css',
})
export class SelectUserComponent {
    private router = inject(Router);
    private api = inject(ApiService);
    private state = inject(AppStateService);

    get currentHouse() {
        return this.state.currentHouse();
    }

    private reload$ = new Subject<void>();

    readonly vm$ = this.reload$.pipe(
        startWith(void 0),
        switchMap(() => {
            const house = this.currentHouse;

            if (!house) {
                this.router.navigate(['/onboarding/select-house']);
                return of({ users: [], loading: false, error: '' });
            }

            return this.api.getHouseUsers(house.id).pipe(
                map(
                    (users): SelectUserViewModel => ({
                        users,
                        loading: false,
                        error: '',
                    })
                ),
                startWith({ users: [], loading: true, error: '' }),
                catchError(() =>
                    of({
                        users: [],
                        loading: false,
                        error: 'No se pudieron cargar los usuarios. Por favor intenta nuevamente.',
                    })
                )
            );
        }),
        shareReplay({ bufferSize: 1, refCount: true })
    );

    loadMembers(): void {
        this.reload$.next();
    }

    selectUser(member: HouseUserResponse): void {
        const user = member.user;
        if (user) {
            this.state.setCurrentUser(user);
            this.router.navigate(['/app']);
        }
    }

    getUserDisplayName(member: HouseUserResponse): string {
        return member.user.name;
    }

    getUserUsername(member: HouseUserResponse): string {
        return member.user.username;
    }

    getUserInitial(member: HouseUserResponse): string {
        return member.user.name?.charAt(0).toUpperCase() || '?';
    }

    getRoleName(roleId: number): string {
        const roles: { [key: number]: string } = {
            1: 'Propietario',
            2: 'Admin',
            3: 'Miembro',
        };
        return roles[roleId] || 'Desconocido';
    }

    goBack(): void {
        this.router.navigate(['/onboarding/select-house']);
    }

    trackByUser(_: number, member: HouseMemberResponse): number {
        return member.id;
    }
}
