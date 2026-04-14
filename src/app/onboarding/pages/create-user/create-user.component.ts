import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateUserRequest } from '../../../core/models/user.model';
import { ApiService } from '../../../core/services/api.service';
import { AppStateService } from '../../../core/state/app-state.service';

@Component({
    selector: 'app-create-user',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './create-user.component.html',
    styleUrl: './create-user.component.css',
})
export class CreateUserComponent {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private api = inject(ApiService);
    private state = inject(AppStateService);

    intent = this.route.snapshot.queryParamMap.get('intent') ?? 'create-house';

    form: CreateUserRequest = { name: '', email: '', username: '' };
    loading = signal(false);
    error = signal('');

    submit(): void {
        if (!this.form.name.trim() || !this.form.email.trim() || !this.form.username.trim()) {
            this.error.set('Por favor completa todos los campos.');
            return;
        }

        this.loading.set(true);
        this.error.set('');

        this.api.createUser(this.form).subscribe({
            next: (user) => {
                this.state.setCurrentUser(user);
                this.loading.set(false);
                if (this.intent === 'join-house') {
                    this.router.navigate(['/onboarding/join-house']);
                } else {
                    this.router.navigate(['/onboarding/create-house']);
                }
            },
            error: () => {
                this.loading.set(false);
                this.error.set('No se pudo crear el usuario. Intenta de nuevo.');
            },
        });
    }

    goBack(): void {
        this.router.navigate(['/onboarding']);
    }
}
