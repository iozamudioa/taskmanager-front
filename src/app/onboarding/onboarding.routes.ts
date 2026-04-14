import { Routes } from '@angular/router';

export const onboardingRoutes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/welcome/welcome.component').then((m) => m.WelcomeComponent),
    },
    {
        path: 'create-user',
        loadComponent: () =>
            import('./pages/create-user/create-user.component').then((m) => m.CreateUserComponent),
    },
    {
        path: 'create-house',
        loadComponent: () =>
            import('./pages/create-house/create-house.component').then((m) => m.CreateHouseComponent),
    },
    {
        path: 'join-house',
        loadComponent: () =>
            import('./pages/join-house/join-house.component').then((m) => m.JoinHouseComponent),
    },
    {
        path: 'invite-members',
        loadComponent: () =>
            import('./pages/invite-members/invite-members.component').then(
                (m) => m.InviteMembersComponent
            ),
    },
    {
        path: 'find-user',
        loadComponent: () =>
            import('./pages/find-user/find-user.component').then((m) => m.FindUserComponent),
    },
    {
        path: 'select-house',
        loadComponent: () =>
            import('./pages/select-house/select-house.component').then((m) => m.SelectHouseComponent),
    },
    {
        path: 'select-user',
        loadComponent: () =>
            import('./pages/select-user/select-user.component').then((m) => m.SelectUserComponent),
    },
];
