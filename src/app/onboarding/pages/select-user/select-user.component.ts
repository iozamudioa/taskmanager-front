import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, NgZone, OnDestroy, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, map, of, shareReplay, startWith, Subject, switchMap } from 'rxjs';
import { HouseMemberResponse } from '../../../core/models/house.model';
import { ApiService, HouseUserResponse } from '../../../core/services/api.service';
import { AppStateService } from '../../../core/state/app-state.service';

interface SelectUserViewModel {
    users: HouseUserResponse[];
    loading: boolean;
    error: string;
}

type PinMode = 'validate' | 'setup';

@Component({
    selector: 'app-select-user',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './select-user.component.html',
    styleUrl: './select-user.component.css',
})
export class SelectUserComponent implements OnDestroy {
    private router = inject(Router);
    private api = inject(ApiService);
    private state = inject(AppStateService);
    private zone = inject(NgZone);
    private pinInputRef = viewChild<ElementRef<HTMLInputElement>>('pinInput');
    private pinConfirmInputRef = viewChild<ElementRef<HTMLInputElement>>('pinConfirmInput');
    readonly pinSlotCount = 4;

    get currentHouse() {
        return this.state.currentHouse();
    }

    private reload$ = new Subject<void>();
    pinModalOpen = signal(false);
    pinMode = signal<PinMode>('validate');
    pinValue = '';
    pinConfirmValue = '';
    showPin = false;
    showPinConfirm = false;
    pinSubmitting = signal(false);
    pinError = signal('');
    showPinSetupSuccess = signal(false);
    pinTargetMember: HouseUserResponse | null = null;
    toastMessage = signal('');
    showToast = signal(false);
    private toastTimer: ReturnType<typeof setTimeout> | null = null;

    readonly vm$ = this.reload$.pipe(
        startWith(void 0),
        switchMap(() => {
            const house = this.currentHouse;

            if (!house) {
                this.router.navigate(['/onboarding/select-house']);
                return of({ users: [], loading: false, error: '' });
            }

            return this.api.getHouseUsers(house.id).pipe(
                map(
                    (users): SelectUserViewModel => ({
                        users: this.sortUsersForDisplay(users),
                        loading: false,
                        error: '',
                    })
                ),
                startWith({ users: [], loading: true, error: '' }),
                catchError(() =>
                    of({
                        users: [],
                        loading: false,
                        error: 'No se pudieron cargar los usuarios. Por favor intenta nuevamente.',
                    })
                )
            );
        }),
        shareReplay({ bufferSize: 1, refCount: true })
    );

    loadMembers(): void {
        this.reload$.next();
    }

    async selectUser(member: HouseUserResponse): Promise<void> {
        const user = member.user;
        if (!user) {
            return;
        }

        if (this.requiresPin(member)) {
            this.openPinModal(member);
            return;
        }

        this.completeLogin(member);
    }

    getUserDisplayName(member: HouseUserResponse): string {
        return member.user.name;
    }

    getUserUsername(member: HouseUserResponse): string {
        return member.user.username;
    }

    getUserInitial(member: HouseUserResponse): string {
        return member.user.name?.charAt(0).toUpperCase() || '?';
    }

    getRoleName(roleId: number): string {
        const roles: { [key: number]: string } = {
            1: 'Propietario',
            2: 'Admin',
            3: 'Miembro',
        };
        return roles[roleId] || 'Desconocido';
    }

    closePinModal(): void {
        if (this.pinSubmitting()) {
            return;
        }

        this.pinModalOpen.set(false);
        this.pinTargetMember = null;
        this.pinError.set('');
        this.pinValue = '';
        this.pinConfirmValue = '';
        this.pinMode.set('validate');
        this.showPin = false;
        this.showPinConfirm = false;
        this.showPinSetupSuccess.set(false);
    }

    onPinSetupSuccessAccept(): void {
        const member = this.pinTargetMember;
        this.showPinSetupSuccess.set(false);

        if (!member) {
            return;
        }

        this.completeLogin(member);
    }

    togglePinVisibility(): void {
        this.showPin = !this.showPin;
    }

    togglePinConfirmVisibility(): void {
        this.showPinConfirm = !this.showPinConfirm;
    }

    updatePin(value: string): void {
        this.pinValue = this.normalizePinInput(value);

        if (this.pinMode() === 'validate' && this.pinValue.length === this.pinSlotCount && !this.pinSubmitting()) {
            void this.submitPin();
            return;
        }

        if (this.pinMode() === 'setup' && this.pinValue.length === this.pinSlotCount && !this.pinConfirmValue) {
            this.queuePinConfirmFocus();
        }
    }

    updatePinConfirm(value: string): void {
        this.pinConfirmValue = this.normalizePinInput(value);

        if (this.pinMode() === 'setup' && this.pinConfirmValue.length === this.pinSlotCount && !this.pinSubmitting()) {
            void this.submitPin();
        }
    }

    onPinEnter(): void {
        if (!this.pinSubmitting()) {
            void this.submitPin();
        }
    }

    focusPinInput(): void {
        this.pinInputRef()?.nativeElement.focus();
    }

    focusPinConfirmInput(): void {
        this.pinConfirmInputRef()?.nativeElement.focus();
    }

    getPinSlots(value: string): string[] {
        return Array.from({ length: this.pinSlotCount }, (_, index) => value[index] ?? '');
    }

    getPinSlotDisplay(value: string, isVisible: boolean): string {
        if (!value) {
            return '–';
        }

        return isVisible ? value : '●';
    }

    getPinModalTitle(): string {
        return this.pinMode() === 'setup' ? 'Configurar PIN' : 'Ingresa tu PIN';
    }

    getPinActionText(): string {
        return this.pinMode() === 'setup' ? 'Guardar PIN' : 'Entrar';
    }

    getPinModalInfo(): string {
        return this.pinMode() === 'setup'
            ? 'Este usuario no tiene PIN configurado. Crea y confirma un PIN para continuar.'
            : 'Ingresa el PIN para acceder con este usuario.';
    }

    async submitPin(): Promise<void> {
        const member = this.pinTargetMember;

        if (!member?.user?.id) {
            this.pinError.set('No se pudo validar el usuario seleccionado.');
            return;
        }

        if (!this.pinValue) {
            this.pinError.set('Ingresa un PIN.');
            this.queuePinInputFocus();
            return;
        }

        if (this.pinValue.length !== this.pinSlotCount) {
            this.pinError.set(`El PIN debe tener ${this.pinSlotCount} números.`);
            this.queuePinInputFocus();
            return;
        }

        if (this.pinMode() === 'setup' && this.pinValue !== this.pinConfirmValue) {
            this.pinError.set('Los PIN no coinciden.');
            return;
        }

        if (this.pinMode() === 'setup' && this.pinConfirmValue.length !== this.pinSlotCount) {
            this.pinError.set(`Confirma los ${this.pinSlotCount} números del PIN.`);
            return;
        }

        this.runInUi(() => {
            this.pinSubmitting.set(true);
            this.pinError.set('');
            this.showPinSetupSuccess.set(false);
        });

        if (this.pinMode() === 'validate') {
            const response = await firstValueFrom(
                this.api.validatePin({
                    userId: member.user.id,
                    pin: this.pinValue,
                }).pipe(
                    catchError(() =>
                        of({
                            valid: false,
                            code: 'PIN_VALIDATION_FAILED',
                            message: 'No se pudo validar el PIN.',
                            requiresPinSetup: false,
                        })
                    )
                )
            );

            if (response.requiresPinSetup || response.code === 'PIN_SETUP_REQUIRED') {
                this.activatePinSetupMode();
                this.runInUi(() => {
                    this.pinSubmitting.set(false);
                });
                return;
            }

            if (response.code === 'UNAUTHORIZED') {
                const message = response.message ?? 'Sesión no autorizada.';
                this.pinError.set(message);
                this.showErrorToast(message);
                this.runInUi(() => {
                    this.pinSubmitting.set(false);
                });
                return;
            }

            if (!response.valid || response.code === 'INVALID_PIN') {
                this.runInUi(() => {
                    this.pinSubmitting.set(false);
                });
                this.setInvalidPinFeedback();
                return;
            }

            this.completeLogin(member);
            this.runInUi(() => {
                this.pinSubmitting.set(false);
            });
            return;
        }

        const createResponse = await firstValueFrom(
            this.api.createPin({
                userId: member.user.id,
                pin: this.pinValue,
                confirmPin: this.pinConfirmValue,
            }).pipe(
                catchError(() =>
                    of({
                        success: false,
                        code: 'PIN_CREATE_FAILED',
                        message: 'No se pudo crear el PIN. Intenta nuevamente.',
                    })
                )
            )
        );

        if (!createResponse.success) {
            const message = createResponse.message ?? 'No se pudo crear el PIN. Intenta nuevamente.';
            this.pinError.set(message);
            this.showErrorToast(message);
            this.runInUi(() => {
                this.pinSubmitting.set(false);
            });
            return;
        }

        this.runInUi(() => {
            this.pinSubmitting.set(false);
            this.pinError.set('');
            this.showPinSetupSuccess.set(true);
        });
    }

    goBack(): void {
        this.router.navigate(['/onboarding/select-house']);
    }

    trackByUser(_: number, member: HouseMemberResponse): number {
        return member.id;
    }

    private sortUsersForDisplay(users: HouseUserResponse[]): HouseUserResponse[] {
        return [...users].sort((left, right) => {
            const leftPriority = this.getUserDisplayPriority(left.roleId);
            const rightPriority = this.getUserDisplayPriority(right.roleId);

            if (leftPriority !== rightPriority) {
                return leftPriority - rightPriority;
            }

            return left.user.name.localeCompare(right.user.name, 'es', { sensitivity: 'base' });
        });
    }

    private getUserDisplayPriority(roleId: number): number {
        if (roleId === 3) {
            return 0;
        }

        if (roleId === 2) {
            return 1;
        }

        if (roleId === 1) {
            return 2;
        }

        return 3;
    }

    private openPinModal(member: HouseUserResponse): void {
        this.pinTargetMember = member;
        this.pinModalOpen.set(true);
        this.pinMode.set('validate');
        this.pinValue = '';
        this.pinConfirmValue = '';
        this.pinError.set('');
        this.showPin = false;
        this.showPinConfirm = false;
        this.showPinSetupSuccess.set(false);
        this.queuePinInputFocus();
    }

    private requiresPin(member: HouseUserResponse): boolean {
        return member.roleId === 1 || member.roleId === 2;
    }

    private completeLogin(member: HouseUserResponse): void {
        const user = member.user;
        if (!user) {
            return;
        }

        this.state.setCurrentUser(user);
        this.pinModalOpen.set(false);
        this.router.navigate(['/app']);
    }

    private normalizePinInput(value: string): string {
        return value.replace(/\D/g, '').slice(0, this.pinSlotCount);
    }

    private activatePinSetupMode(): void {
        this.runInUi(() => {
            this.pinMode.set('setup');
            this.pinValue = '';
            this.pinConfirmValue = '';
            this.pinError.set('');
            this.showPinSetupSuccess.set(false);
            this.queuePinInputFocus();
        });
    }

    private showErrorToast(message: string): void {
        this.runInUi(() => {
            this.toastMessage.set(message);
            this.showToast.set(true);

            if (this.toastTimer) {
                clearTimeout(this.toastTimer);
            }

            this.toastTimer = setTimeout(() => {
                this.runInUi(() => {
                    this.showToast.set(false);
                });
            }, 2500);
        });
    }

    private setInvalidPinFeedback(): void {
        this.runInUi(() => {
            this.pinError.set('PIN incorrecto.');
            this.pinValue = '';
            this.showErrorToast('PIN incorrecto. Intenta nuevamente.');
            this.queuePinInputFocus();
        });
    }

    private runInUi(action: () => void): void {
        if (NgZone.isInAngularZone()) {
            action();
            return;
        }

        this.zone.run(action);
    }

    private queuePinInputFocus(): void {
        setTimeout(() => {
            this.runInUi(() => {
                this.focusPinInput();
            });
        }, 60);
    }

    private queuePinConfirmFocus(): void {
        setTimeout(() => {
            this.runInUi(() => {
                this.focusPinConfirmInput();
            });
        }, 60);
    }

    ngOnDestroy(): void {
        if (this.toastTimer) {
            clearTimeout(this.toastTimer);
        }
    }
}
