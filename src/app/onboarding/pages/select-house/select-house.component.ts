import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, shareReplay, startWith, Subject, switchMap } from 'rxjs';
import { HouseResponse } from '../../../core/models/house.model';
import { ApiService } from '../../../core/services/api.service';
import { AppStateService } from '../../../core/state/app-state.service';

interface SelectHouseViewModel {
    houses: HouseResponse[];
    loading: boolean;
    error: string;
}

@Component({
    selector: 'app-select-house',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './select-house.component.html',
    styleUrl: './select-house.component.css',
})
export class SelectHouseComponent {
    private router = inject(Router);
    private api = inject(ApiService);
    private state = inject(AppStateService);

    private reload$ = new Subject<void>();

    readonly vm$ = this.reload$.pipe(
        startWith(void 0),
        switchMap(() =>
            this.api.getAllHouses().pipe(
                map(
                    (houses): SelectHouseViewModel => ({
                        houses,
                        loading: false,
                        error: '',
                    })
                ),
                startWith({ houses: [], loading: true, error: '' }),
                catchError(() =>
                    of({
                        houses: [],
                        loading: false,
                        error: 'No se pudieron cargar las casas. Por favor intenta nuevamente.',
                    })
                )
            )
        ),
        shareReplay({ bufferSize: 1, refCount: true })
    );

    loadHouses(): void {
        this.reload$.next();
    }

    selectHouse(house: HouseResponse): void {
        this.state.setCurrentHouse(house);
        this.router.navigate(['/onboarding/select-user']);
    }

    goBack(): void {
        this.router.navigate(['/onboarding']);
    }

    trackByHouse(_: number, house: HouseResponse): number {
        return house.id;
    }
}
