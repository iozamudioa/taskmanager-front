import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStateService } from '../state/app-state.service';

/** Redirects to /onboarding if the user has not completed onboarding. */
export const onboardingGuard: CanActivateFn = () => {
    const state = inject(AppStateService);
    const router = inject(Router);
    if (!state.isOnboarded()) {
        router.navigate(['/onboarding']);
        return false;
    }
    return true;
};

/** Redirects to /app if the user already completed onboarding. */
export const alreadyOnboardedGuard: CanActivateFn = () => {
    const state = inject(AppStateService);
    const router = inject(Router);
    if (state.isOnboarded()) {
        router.navigate(['/app']);
        return false;
    }
    return true;
};
