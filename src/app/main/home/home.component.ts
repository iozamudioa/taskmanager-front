import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../core/state/app-state.service';

@Component({
    selector: 'app-home',
    standalone: true,
    template: `
    <div class="placeholder">
      <span class="icon">🏠</span>
      <h2>{{ state.currentHouse()?.name }}</h2>
      <p>Bienvenido, {{ state.currentUser()?.name }}</p>
      <p class="coming-soon">Módulo principal — próximamente</p>
      <button class="btn-logout" (click)="logout()">Cerrar sesión</button>
    </div>
  `,
    styles: [`
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      gap: 0.5rem;
      background: #f8f9ff;
      text-align: center;
      padding: 2rem;
    }
    .icon { font-size: 4rem; }
    h2 { font-size: 1.8rem; font-weight: 800; color: #1a1a2e; margin: 0; }
    p { color: #6b7280; margin: 0; }
    .coming-soon { font-size: 0.85rem; margin-top: 0.5rem; }
    .btn-logout {
      margin-top: 2rem;
      padding: 0.6rem 1.25rem;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      background: white;
      font-size: 0.875rem;
      font-weight: 600;
      color: #ef4444;
      cursor: pointer;
    }
  `],
})
export class HomeComponent {
    state = inject(AppStateService);
    private router = inject(Router);

    logout(): void {
        this.state.clearAll();
        this.router.navigate(['/onboarding'], { replaceUrl: true });
    }
}
