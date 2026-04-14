import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AppStateService } from '../../../core/state/app-state.service';

@Component({
    selector: 'app-create-house',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './create-house.component.html',
    styleUrl: './create-house.component.css',
})
export class CreateHouseComponent implements OnInit {
    private router = inject(Router);
    private api = inject(ApiService);
    private state = inject(AppStateService);

    houseName = '';
    loading = signal(false);
    error = signal('');

    ngOnInit(): void {
        if (!this.state.currentUser()) {
            this.router.navigate(['/onboarding/create-user'], { queryParams: { intent: 'create-house' } });
        }
    }

    get currentUser() {
        return this.state.currentUser();
    }

    submit(): void {
        if (!this.houseName.trim()) {
            this.error.set('Por favor ingresa un nombre para la casa.');
            return;
        }

        const user = this.state.currentUser();
        if (!user) {
            this.router.navigate(['/onboarding/create-user'], { queryParams: { intent: 'create-house' } });
            return;
        }

        this.loading.set(true);
        this.error.set('');

        this.api.createHouse({ name: this.houseName.trim(), userId: user.id }).subscribe({
            next: (house) => {
                this.state.setCurrentHouse(house);
                this.loading.set(false);
                this.router.navigate(['/onboarding/invite-members']);
            },
            error: () => {
                this.loading.set(false);
                this.error.set('No se pudo crear la casa. Intenta de nuevo.');
            },
        });
    }

    goBack(): void {
        this.router.navigate(['/onboarding/create-user'], { queryParams: { intent: 'create-house' } });
    }
}
