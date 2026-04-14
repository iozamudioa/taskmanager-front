import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HouseMemberResponse, ROLE_MEMBER } from '../../../core/models/house.model';
import { CreateUserRequest } from '../../../core/models/user.model';
import { ApiService } from '../../../core/services/api.service';
import { AppStateService } from '../../../core/state/app-state.service';

interface PendingMember {
    form: CreateUserRequest;
    saving: boolean;
    saved: boolean;
    error: string;
}

@Component({
    selector: 'app-invite-members',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './invite-members.component.html',
    styleUrl: './invite-members.component.css',
})
export class InviteMembersComponent implements OnInit {
    private router = inject(Router);
    private api = inject(ApiService);
    private state = inject(AppStateService);

    addingMember = signal(false);
    members = signal<HouseMemberResponse[]>([]);

    newMemberForm: CreateUserRequest = { name: '', email: '', username: '' };
    savingNewMember = signal(false);
    formError = signal('');
    copied = signal(false);

    ngOnInit(): void {
        const house = this.state.currentHouse();
        if (!house) {
            this.router.navigate(['/onboarding'], { replaceUrl: true });
            return;
        }
        this.loadMembers();
    }

    get house() {
        return this.state.currentHouse();
    }

    get currentUser() {
        return this.state.currentUser();
    }

    loadMembers(): void {
        const house = this.state.currentHouse();
        if (!house) return;
        this.api.getMembers(house.id).subscribe({
            next: (members) => {
                this.members.set(members);
                this.state.setHouseMembers(members);
            },
        });
    }

    copyCode(): void {
        if (!this.house?.code) return;
        navigator.clipboard.writeText(this.house.code).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        });
    }

    showAddForm(): void {
        this.addingMember.set(true);
        this.newMemberForm = { name: '', email: '', username: '' };
        this.formError.set('');
    }

    cancelAdd(): void {
        this.addingMember.set(false);
        this.formError.set('');
    }

    saveNewMember(): void {
        if (!this.newMemberForm.name.trim() || !this.newMemberForm.email.trim() || !this.newMemberForm.username.trim()) {
            this.formError.set('Por favor completa todos los campos.');
            return;
        }

        const house = this.state.currentHouse();
        if (!house) return;

        this.savingNewMember.set(true);
        this.formError.set('');

        this.api.createUser(this.newMemberForm).subscribe({
            next: (user) => {
                this.api.addMember(house.id, { userId: user.id, roleId: ROLE_MEMBER }).subscribe({
                    next: () => {
                        this.savingNewMember.set(false);
                        this.addingMember.set(false);
                        this.loadMembers();
                    },
                    error: () => {
                        this.savingNewMember.set(false);
                        this.formError.set('No se pudo añadir el miembro a la casa.');
                    },
                });
            },
            error: () => {
                this.savingNewMember.set(false);
                this.formError.set('No se pudo crear el usuario.');
            },
        });
    }

    finish(): void {
        this.router.navigate(['/app'], { replaceUrl: true });
    }
}
