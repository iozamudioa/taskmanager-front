import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../../core/state/app-state.service';

@Component({
    selector: 'app-welcome',
    standalone: true,
    templateUrl: './welcome.component.html',
    styleUrl: './welcome.component.css',
})
export class WelcomeComponent {
    private router = inject(Router);
    private state = inject(AppStateService);

    goCreateHouse(): void {
        this.router.navigate(['/onboarding/create-user'], { queryParams: { intent: 'create-house' } });
    }

    goJoinHouse(): void {
        this.router.navigate(['/onboarding/create-user'], { queryParams: { intent: 'join-house' } });
    }

    goJoinHouseExisting(): void {
        this.router.navigate(['/onboarding/find-user']);
    }

    goOpenExistingHouse(): void {
        this.router.navigate(['/onboarding/select-house']);
    }
}
