import { Routes } from '@angular/router';
import { alreadyOnboardedGuard, onboardingGuard } from './core/guards/onboarding.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/app',
        pathMatch: 'full',
    },
    {
        path: 'onboarding',
        canActivate: [alreadyOnboardedGuard],
        loadChildren: () =>
            import('./onboarding/onboarding.routes').then((m) => m.onboardingRoutes),
    },
    {
        path: 'app',
        canActivate: [onboardingGuard],
        loadComponent: () =>
            import('./main/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    },
    {
        path: '**',
        redirectTo: '/app',
    },
];
