import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ROLE_MEMBER } from '../../../core/models/house.model';
import { ApiService } from '../../../core/services/api.service';
import { AppStateService } from '../../../core/state/app-state.service';

@Component({
    selector: 'app-join-house',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './join-house.component.html',
    styleUrl: './join-house.component.css',
})
export class JoinHouseComponent implements OnInit {
    private router = inject(Router);
    private api = inject(ApiService);
    private state = inject(AppStateService);

    code = '';
    loading = signal(false);
    error = signal('');

    ngOnInit(): void {
        if (!this.state.currentUser()) {
            this.router.navigate(['/onboarding/create-user'], { queryParams: { intent: 'join-house' } });
        }
    }

    get currentUser() {
        return this.state.currentUser();
    }

    submit(): void {
        const trimmed = this.code.trim().toUpperCase();
        if (!trimmed) {
            this.error.set('Por favor ingresa el código de la casa.');
            return;
        }

        const user = this.state.currentUser();
        if (!user) {
            this.router.navigate(['/onboarding/create-user'], { queryParams: { intent: 'join-house' } });
            return;
        }

        this.loading.set(true);
        this.error.set('');

        this.api
            .joinHouse({ code: trimmed, userId: user.id, roleId: ROLE_MEMBER })
            .subscribe({
                next: (member) => {
                    // Fetch the house details after joining
                    this.api.getHouse(member.houseId).subscribe({
                        next: (house) => {
                            this.state.setCurrentHouse(house);
                            this.loading.set(false);
                            this.router.navigate(['/app']);
                        },
                        error: () => {
                            this.loading.set(false);
                            this.error.set('Se unió a la casa, pero no se pudieron cargar sus datos.');
                        },
                    });
                },
                error: () => {
                    this.loading.set(false);
                    this.error.set('Código inválido o la casa no existe. Intenta de nuevo.');
                },
            });
    }

    goBack(): void {
        this.router.navigate(['/onboarding']);
    }
}
