import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AppStateService } from '../../../core/state/app-state.service';

@Component({
    selector: 'app-find-user',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './find-user.component.html',
    styleUrl: './find-user.component.css',
})
export class FindUserComponent {
    private router = inject(Router);
    private api = inject(ApiService);
    private state = inject(AppStateService);

    userId = '';
    loading = signal(false);
    error = signal('');
    foundUser = signal<{ id: number; name: string; email: string; username: string } | null>(null);

    search(): void {
        const trimmed = String(this.userId).trim();
        const id = parseInt(trimmed, 10);
        if (!trimmed || isNaN(id) || id <= 0) {
            this.error.set('Por favor ingresa un ID de usuario válido.');
            return;
        }

        this.loading.set(true);
        this.error.set('');
        this.foundUser.set(null);

        this.api.getUser(id).subscribe({
            next: (user) => {
                this.loading.set(false);
                this.foundUser.set(user);
            },
            error: () => {
                this.loading.set(false);
                this.error.set('No se encontró ningún usuario con ese ID.');
            },
        });
    }

    confirm(): void {
        const user = this.foundUser();
        if (!user) return;
        this.state.setCurrentUser(user);
        this.router.navigate(['/onboarding/join-house']);
    }

    reset(): void {
        this.foundUser.set(null);
        this.userId = '';
        this.error.set('');
    }

    goBack(): void {
        this.router.navigate(['/onboarding']);
    }
}
