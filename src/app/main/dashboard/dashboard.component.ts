import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColorPickerDirective } from 'ngx-color-picker';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { catchError, firstValueFrom, of } from 'rxjs';
import { HouseMemberResponse, ROLE_ADMIN, ROLE_OWNER, roleName } from '../../core/models/house.model';
import { DashboardResponse, DashboardTaskInstanceResponse } from '../../core/models/task-instance.model';
import { CreateTaskRequest, RECURRENCE_DAYS, RecurrenceDay, UpdateTaskRequest } from '../../core/models/task.model';
import { CreateUserRequest, UpdateUserRequest } from '../../core/models/user.model';
import { ApiService, DashboardPointsResponse, HouseUserResponse } from '../../core/services/api.service';
import { AppStateService } from '../../core/state/app-state.service';

interface TimeSlot {
    time: string;
    hour: number;
    tasks: DashboardTaskInstanceResponse[];
}

interface FireworkParticle {
    x: number;
    y: number;
    dx: number;
    dy: number;
    hue: number;
    delay: number;
}

type ProfilePinMode = 'validate' | 'setup';
type ProfilePinContext = 'change' | 'reauth';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, ImageCropperComponent, ColorPickerDirective],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
    host: {
        '(window:keydown.escape)': 'onEscapeKey()',
        '(window:mousemove)': 'onUserActivity()',
        '(window:keydown)': 'onUserActivity()',
        '(window:click)': 'onUserActivity()',
        '(window:scroll)': 'onUserActivity()',
        '(window:touchstart)': 'onUserActivity()',
    },
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    private state = inject(AppStateService);
    private router = inject(Router);
    private api = inject(ApiService);

    dashboard = signal<DashboardResponse | null>(null);
    members = signal<HouseMemberResponse[]>(this.state.houseMembers());
    houseUsers = signal<HouseUserResponse[]>([]);
    loading = signal(false);
    error = signal('');
    sessionPoints = signal<DashboardPointsResponse | null>(null);
    loadingSessionPoints = signal(false);
    animatedTodayPoints = signal(0);
    animatedMonthPoints = signal(0);
    pointsPulse = signal(false);
    showScreenFireworks = signal(false);
    screenFireworks = signal<FireworkParticle[]>([]);
    showAllCompletedMessage = signal(false);
    headerHeight = signal(0);

    selectedUserId = signal<number | null>(null);
    showCreateModal = signal(false);
    selectedDate = signal(new Date());
    currentClockMs = signal(Date.now());
    completingTaskIds = signal<Record<number, boolean>>({});
    deletingTaskIds = signal<Record<number, boolean>>({});
    creatingTask = signal(false);
    createTaskError = signal('');
    editingTaskId = signal<number | null>(null);
    cloningTask = signal(false);
    taskColorPickerOpen = false;
    taskImagePreview = signal<string | null>(null);

    showProfileModal = signal(false);
    savingProfile = signal(false);
    profileError = signal('');
    profileForm: { name: string; image?: string } = { name: '', image: undefined };
    profileImageFile = signal<File | undefined>(undefined);
    profileCroppedImage = signal<string | undefined>(undefined);
    readonly pinSlotCount = 4;
    showProfilePinModal = signal(false);
    profilePinMode = signal<ProfilePinMode>('validate');
    profilePinContext = signal<ProfilePinContext>('change');
    profilePinSubmitting = signal(false);
    profilePinError = signal('');
    profilePinCurrent = '';
    profilePinNew = '';
    profilePinConfirm = '';
    showProfilePinCurrent = false;
    showProfilePinNew = false;
    showProfilePinConfirm = false;

    showAlertModal = signal(false);
    alertModalTitle = signal('Aviso');
    alertModalMessage = signal('');
    alertModalConfirmOnly = signal(true);
    alertModalConfirmText = signal('Aceptar');
    alertModalCancelText = signal('Cancelar');
    private alertModalAction: (() => void) | null = null;

    // Gestión de usuarios
    showMembersModal = signal(false);
    searchQuery = signal('');
    searchResults = signal<any[]>([]);
    searching = signal(false);
    updatingMemberId = signal<number | null>(null);
    managingRoleId = signal<number | null>(null);

    // Crear nuevo usuario
    showCreateUserForm = signal(false);
    creatingNewUser = signal(false);
    createUserError = signal('');
    newUserForm = signal({
        name: '',
        email: '',
        username: '',
        roleForNewHouse: 3, // Member by default
    });

    recurrenceDays = RECURRENCE_DAYS;
    @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;
    @ViewChild('dashboardDateInput') dashboardDateInput?: ElementRef<HTMLInputElement>;
    @ViewChild('profilePinCurrentInput') profilePinCurrentInput?: ElementRef<HTMLInputElement>;
    @ViewChild('profilePinNewInput') profilePinNewInput?: ElementRef<HTMLInputElement>;
    @ViewChild('profilePinConfirmInput') profilePinConfirmInput?: ElementRef<HTMLInputElement>;

    taskForm: CreateTaskRequest = this.getDefaultTaskForm();

    private pointsPulseTimeout?: ReturnType<typeof setTimeout>;
    private fireworksTimeout?: ReturnType<typeof setTimeout>;
    private todayPointsRaf?: number;
    private monthPointsRaf?: number;
    private clockInterval?: ReturnType<typeof setInterval>;
    private inactivityTimeout?: ReturnType<typeof setTimeout>;
    private lastActivityEventAt = 0;
    private lastAutoScrollContext?: string;
    private skipNextDashboardAutoScroll = false;
    private lastCompletionCelebrationContext?: string;
    private readonly inactivityTimeoutMs = 60_000;

    get currentHouse() {
        return this.state.currentHouse();
    }

    get currentUser() {
        return this.state.currentUser();
    }

    get tasks(): DashboardTaskInstanceResponse[] {
        return this.dashboard()?.todayInstances ?? [];
    }

    get selectedDateTitle(): string {
        const date = this.selectedDate();
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} del ${date.getFullYear()}`;
    }

    get selectedDateInputValue(): string {
        return this.toIsoDate(this.selectedDate());
    }

    get todayInputValue(): string {
        return this.toIsoDate(new Date());
    }

    get timeSlots(): TimeSlot[] {
        const slots = new Map<number, TimeSlot>();

        for (let h = 0; h < 24; h++) {
            slots.set(h, { time: this.formatHour(h), hour: h, tasks: [] });
        }

        for (const task of this.tasks) {
            if (task.startTime) {
                const [hour] = task.startTime.split(':');
                const parsedHour = Number.parseInt(hour, 10);
                if (slots.has(parsedHour)) {
                    slots.get(parsedHour)!.tasks.push(task);
                }
            } else {
                slots.get(0)!.tasks.push(task);
            }
        }

        slots.forEach((slot) => {
            slot.tasks.sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
        });

        if (this.tasks.length > 0) {
            return Array.from(slots.values()).filter((slot) => slot.tasks.length > 0);
        }

        return Array.from(slots.values());
    }

    get userRole(): number {
        const house = this.currentHouse;
        if (!house) return 0;
        const member = this.members().find((m) => m.userId === this.currentUser?.id);
        return member?.roleId ?? 0;
    }

    get isAdmin(): boolean {
        return this.userRole === ROLE_OWNER || this.userRole === ROLE_ADMIN;
    }

    get isOwner(): boolean {
        return this.userRole === ROLE_OWNER;
    }

    get canUseDashboardDateNav(): boolean {
        return this.userRole === ROLE_OWNER || this.userRole === ROLE_ADMIN;
    }

    get hourHeaderStickyTop(): number {
        return this.getStickyOffset();
    }

    ngOnInit(): void {
        if (!this.currentHouse) {
            this.router.navigate(['/onboarding'], { replaceUrl: true });
            return;
        }

        if (!this.currentUser) {
            this.router.navigate(['/onboarding/select-user'], { replaceUrl: true });
            return;
        }

        this.startClockTicker();
        this.startInactivityTimer();

        if (this.shouldRequireRefreshPin()) {
            this.openRefreshPinModal();
            return;
        }

        if (!this.isAdmin && this.currentUser?.id) {
            this.selectedUserId.set(this.currentUser.id);
        }
        this.loadDashboardSession();
    }

    ngAfterViewInit(): void {
        const headerEl = document.querySelector('.dashboard-header');
        if (headerEl) {
            this.headerHeight.set(headerEl.getBoundingClientRect().height);
        }
    }

    ngOnDestroy(): void {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }

        this.clearInactivityTimer();
    }

    onUserActivity(): void {
        const now = Date.now();
        if (now - this.lastActivityEventAt < 1000) {
            return;
        }

        this.lastActivityEventAt = now;
        this.resetInactivityTimer();
    }

    loadMembers(): void {
        const house = this.currentHouse;
        if (!house) return;
        this.api.getHouseUsers(house.id).subscribe({
            next: (houseUsers) => {
                this.houseUsers.set(houseUsers);
                const members = houseUsers.map(({ user, ...member }) => member);
                this.state.setHouseMembers(members);
                this.members.set(members);
            },
        });
    }

    loadDashboard(): void {
        const house = this.currentHouse;
        const user = this.currentUser;
        if (!house || !user) return;

        this.loading.set(true);
        this.error.set('');

        const userId = this.isAdmin ? (this.selectedUserId() ?? undefined) : user.id;
        const dashboardDate = this.formatDashboardRequestDate(this.selectedDate());

        this.api.getDashboard(house.id, userId, dashboardDate).subscribe({
            next: (dashboard) => {
                this.dashboard.set(dashboard);
                this.updateAllCompletedStatusAndCelebrate(dashboard, userId);
                this.loading.set(false);
                if (this.skipNextDashboardAutoScroll) {
                    this.skipNextDashboardAutoScroll = false;
                    this.lastAutoScrollContext = `${this.formatDashboardRequestDate(this.selectedDate())}|${this.selectedUserId() ?? 'all'}`;
                    return;
                }
                setTimeout(() => this.autoScrollToRelevantSlotIfNeeded(), 80);
            },
            error: () => {
                this.loading.set(false);
                this.error.set('No se pudo cargar el dashboard.');
            },
        });
    }

    loadSessionPoints(): void {
        const house = this.currentHouse;
        const user = this.currentUser;
        if (!house || !user) return;

        const pointsUserId = this.isAdmin ? (this.selectedUserId() ?? user.id) : user.id;

        this.loadingSessionPoints.set(true);
        this.api.getDashboardPoints(house.id, pointsUserId).subscribe({
            next: (points) => {
                const prevToday = this.animatedTodayPoints();
                const prevMonth = this.animatedMonthPoints();

                this.sessionPoints.set(points);
                this.loadingSessionPoints.set(false);

                this.animatePointsCounters(points.todayPoints, points.monthPoints);

                if (prevToday !== points.todayPoints || prevMonth !== points.monthPoints) {
                    this.pointsPulse.set(true);
                    if (this.pointsPulseTimeout) {
                        clearTimeout(this.pointsPulseTimeout);
                    }
                    this.pointsPulseTimeout = setTimeout(() => this.pointsPulse.set(false), 520);
                }
            },
            error: () => {
                this.loadingSessionPoints.set(false);
            },
        });
    }

    selectUser(userId: number | null): void {
        if (!this.isAdmin) {
            return;
        }
        this.selectedUserId.set(userId);
        this.loadDashboard();
        this.loadSessionPoints();
    }

    goToPreviousDate(): void {
        this.shiftSelectedDate(-1);
    }

    goToNextDate(): void {
        this.shiftSelectedDate(1);
    }

    goToToday(): void {
        const today = new Date();
        if (this.toIsoDate(this.selectedDate()) === this.toIsoDate(today)) {
            return;
        }

        this.selectedDate.set(today);
        this.loadDashboard();
    }

    openDashboardDatePicker(): void {
        const input = this.dashboardDateInput?.nativeElement;
        if (!input) {
            return;
        }

        if (typeof input.showPicker === 'function') {
            input.showPicker();
            return;
        }

        input.click();
    }

    onDashboardDateSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.value) {
            return;
        }

        const nextDate = new Date(`${input.value}T12:00:00`);
        if (Number.isNaN(nextDate.getTime())) {
            return;
        }

        this.selectedDate.set(nextDate);
        this.loadDashboard();
    }

    openCreateModal(): void {
        if (!this.isAdmin) {
            return;
        }

        this.taskForm = this.getDefaultTaskForm();
        this.cloningTask.set(false);
        this.normalizeRecurrenceByDateRange();
        this.createTaskError.set('');
        this.editingTaskId.set(null);
        this.showCreateModal.set(true);
        this.focusTitleInput();
    }

    openProfileModal(): void {
        const user = this.currentUser;
        if (!user) {
            return;
        }

        this.profileForm = {
            name: user.name || '',
            image: user.image,
        };
        this.profileError.set('');
        this.profileImageFile.set(undefined);
        this.profileCroppedImage.set(undefined);
        this.savingProfile.set(false);
        this.resetProfilePinFlow();
        this.showProfileModal.set(true);
    }

    closeProfileModal(): void {
        this.showProfileModal.set(false);
        this.savingProfile.set(false);
        this.profileError.set('');
        this.profileImageFile.set(undefined);
        this.profileCroppedImage.set(undefined);
        this.resetProfilePinFlow();
    }

    openProfilePinModal(): void {
        if (!this.currentUser) {
            return;
        }

        this.resetProfilePinFlow();
        this.profilePinContext.set('change');
        this.showProfilePinModal.set(true);
        this.queueProfilePinCurrentFocus();
    }

    closeProfilePinModal(): void {
        if (this.profilePinSubmitting()) {
            return;
        }

        if (this.profilePinContext() === 'reauth') {
            this.resetProfilePinFlow();
            this.logout();
            return;
        }

        this.resetProfilePinFlow();
    }

    updateProfilePinCurrent(value: string): void {
        this.profilePinCurrent = this.normalizePinValue(value);

        if (this.profilePinMode() === 'validate' && this.profilePinCurrent.length === this.pinSlotCount && !this.profilePinSubmitting()) {
            void this.submitProfilePinChange();
        }
    }

    updateProfilePinNew(value: string): void {
        this.profilePinNew = this.normalizePinValue(value);

        if (this.profilePinMode() === 'setup' && this.profilePinNew.length === this.pinSlotCount && !this.profilePinConfirm) {
            this.queueProfilePinConfirmFocus();
        }
    }

    updateProfilePinConfirm(value: string): void {
        this.profilePinConfirm = this.normalizePinValue(value);

        if (this.profilePinMode() === 'setup' && this.profilePinConfirm.length === this.pinSlotCount && !this.profilePinSubmitting()) {
            void this.submitProfilePinChange();
        }
    }

    onProfilePinEnter(): void {
        if (!this.profilePinSubmitting()) {
            void this.submitProfilePinChange();
        }
    }

    getProfilePinModalTitle(): string {
        if (this.profilePinMode() === 'setup') {
            return 'Configurar PIN nuevo';
        }

        return this.profilePinContext() === 'reauth' ? 'Ingresa tu PIN' : 'Ingresa tu PIN actual';
    }

    getProfilePinActionText(): string {
        if (this.profilePinMode() === 'setup') {
            return 'Guardar PIN';
        }

        return this.profilePinContext() === 'reauth' ? 'Entrar' : 'Continuar';
    }

    getProfilePinSlots(value: string): string[] {
        return Array.from({ length: this.pinSlotCount }, (_, index) => value[index] ?? '');
    }

    getProfilePinSlotDisplay(value: string, isVisible: boolean): string {
        if (!value) {
            return '–';
        }

        return isVisible ? value : '●';
    }

    focusProfilePinCurrentInput(): void {
        this.profilePinCurrentInput?.nativeElement.focus();
    }

    focusProfilePinNewInput(): void {
        this.profilePinNewInput?.nativeElement.focus();
    }

    focusProfilePinConfirmInput(): void {
        this.profilePinConfirmInput?.nativeElement.focus();
    }

    toggleProfilePinCurrentVisibility(): void {
        this.showProfilePinCurrent = !this.showProfilePinCurrent;
    }

    toggleProfilePinNewVisibility(): void {
        this.showProfilePinNew = !this.showProfilePinNew;
    }

    toggleProfilePinConfirmVisibility(): void {
        this.showProfilePinConfirm = !this.showProfilePinConfirm;
    }

    async submitProfilePinChange(): Promise<void> {
        const user = this.currentUser;
        if (!user) {
            this.profilePinError.set('No se pudo identificar el usuario actual.');
            return;
        }

        if (this.profilePinMode() === 'validate') {
            if (!this.profilePinCurrent) {
                this.profilePinError.set(this.profilePinContext() === 'reauth' ? 'Ingresa tu PIN.' : 'Ingresa tu PIN actual.');
                this.queueProfilePinCurrentFocus();
                return;
            }

            if (this.profilePinCurrent.length !== this.pinSlotCount) {
                this.profilePinError.set(
                    this.profilePinContext() === 'reauth'
                        ? `El PIN debe tener ${this.pinSlotCount} números.`
                        : `El PIN actual debe tener ${this.pinSlotCount} números.`
                );
                this.queueProfilePinCurrentFocus();
                return;
            }
        } else {
            if (!this.profilePinNew || this.profilePinNew.length !== this.pinSlotCount) {
                this.profilePinError.set(`El PIN nuevo debe tener ${this.pinSlotCount} números.`);
                this.queueProfilePinNewFocus();
                return;
            }

            if (!this.profilePinConfirm || this.profilePinConfirm.length !== this.pinSlotCount) {
                this.profilePinError.set(`Confirma los ${this.pinSlotCount} números del PIN.`);
                this.queueProfilePinConfirmFocus();
                return;
            }

            if (this.profilePinNew !== this.profilePinConfirm) {
                this.profilePinError.set('Los PIN no coinciden.');
                this.queueProfilePinConfirmFocus();
                return;
            }
        }

        this.profilePinSubmitting.set(true);
        this.profilePinError.set('');

        if (this.profilePinMode() === 'validate') {
            const response = await firstValueFrom(
                this.api.validatePin({
                    userId: user.id,
                    pin: this.profilePinCurrent,
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

            if (this.profilePinContext() === 'reauth') {
                if (response.valid) {
                    this.profilePinSubmitting.set(false);
                    this.resetProfilePinFlow();
                    if (!this.isAdmin && this.currentUser?.id) {
                        this.selectedUserId.set(this.currentUser.id);
                    }
                    this.loadDashboardSession();
                    return;
                }

                if (response.code === 'UNAUTHORIZED') {
                    this.profilePinError.set(response.message ?? 'Sesión no autorizada.');
                    this.profilePinSubmitting.set(false);
                    return;
                }

                this.profilePinCurrent = '';
                this.profilePinError.set(response.message ?? 'PIN incorrecto.');
                this.profilePinSubmitting.set(false);
                this.queueProfilePinCurrentFocus();
                return;
            }

            if (response.valid || response.requiresPinSetup || response.code === 'PIN_SETUP_REQUIRED') {
                this.profilePinMode.set('setup');
                this.profilePinNew = '';
                this.profilePinConfirm = '';
                this.profilePinSubmitting.set(false);
                this.profilePinError.set('');
                this.queueProfilePinNewFocus();
                return;
            }

            if (response.code === 'UNAUTHORIZED') {
                this.profilePinError.set(response.message ?? 'Sesión no autorizada.');
                this.profilePinSubmitting.set(false);
                return;
            }

            this.profilePinCurrent = '';
            this.profilePinError.set('PIN actual incorrecto.');
            this.profilePinSubmitting.set(false);
            this.queueProfilePinCurrentFocus();
            return;
        }

        const createResponse = await firstValueFrom(
            this.api.createPin({
                userId: user.id,
                pin: this.profilePinNew,
                confirmPin: this.profilePinConfirm,
            }).pipe(
                catchError(() =>
                    of({
                        success: false,
                        code: 'PIN_CREATE_FAILED',
                        message: 'No se pudo actualizar el PIN. Intenta de nuevo.',
                    })
                )
            )
        );

        if (!createResponse.success) {
            this.profilePinError.set(createResponse.message ?? 'No se pudo actualizar el PIN. Intenta de nuevo.');
            this.profilePinSubmitting.set(false);
            return;
        }

        this.profilePinSubmitting.set(false);
        this.resetProfilePinFlow();
        this.openInfoModal('PIN actualizado', 'Tu PIN se actualizó correctamente.');
    }

    async onProfileGalleryImageSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
            this.profileImageFile.set(file);
            this.profileCroppedImage.set(undefined);
            this.profileForm.image = undefined;
            this.profileError.set('');
        } catch {
            this.profileError.set('No se pudo procesar la imagen seleccionada.');
        } finally {
            input.value = '';
        }
    }

    async onProfileCameraImageSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
            this.profileImageFile.set(file);
            this.profileCroppedImage.set(undefined);
            this.profileForm.image = undefined;
            this.profileError.set('');
        } catch {
            this.profileError.set('No se pudo procesar la foto de la cámara.');
        } finally {
            input.value = '';
        }
    }

    onProfileImageCropped(event: ImageCroppedEvent): void {
        // ngx-image-cropper v9 removed event.base64; use event.blob with FileReader
        const blobSource = event.blob ?? null;
        if (!blobSource) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const rawB64 = reader.result as string;
            const img = new Image();
            img.onload = () => {
                const maxSize = 512;
                let { width, height } = img;
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    this.profileCroppedImage.set(rawB64);
                    this.profileForm.image = rawB64;
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL('image/jpeg', 0.82);
                this.profileCroppedImage.set(compressed);
                this.profileForm.image = compressed;
            };
            img.onerror = () => {
                this.profileCroppedImage.set(rawB64);
                this.profileForm.image = rawB64;
            };
            img.src = rawB64;
        };
        reader.readAsDataURL(blobSource);
    }

    onProfileImageLoadFailed(): void {
        this.profileImageFile.set(undefined);
        this.profileCroppedImage.set(undefined);
        this.profileError.set('No se pudo cargar la imagen para recortarla.');
    }

    clearProfileImage(): void {
        this.profileForm.image = undefined;
        this.profileImageFile.set(undefined);
        this.profileCroppedImage.set(undefined);
    }

    saveProfile(): void {
        const user = this.currentUser;
        if (!user) {
            return;
        }

        const trimmedName = this.profileForm.name.trim();
        if (!trimmedName) {
            this.profileError.set('El nombre es obligatorio.');
            return;
        }

        const currentName = user.name?.trim() ?? '';
        const nameChanged = trimmedName !== currentName;

        const imagePayload = this.getProfileImagePayload();
        const shouldSyncImage = !!imagePayload;

        if (!nameChanged && !shouldSyncImage) {
            this.showProfileModal.set(false);
            return;
        }

        this.savingProfile.set(true);
        this.profileError.set('');

        if (nameChanged) {
            const request: UpdateUserRequest = { name: trimmedName };
            this.api.updateUser(user.id, request).subscribe({
                next: (updatedUser) => {
                    if (shouldSyncImage && imagePayload) {
                        this.patchProfileImage(user.id, imagePayload, updatedUser);
                        return;
                    }
                    this.applyUpdatedUser(updatedUser);
                },
                error: () => {
                    this.savingProfile.set(false);
                    this.profileError.set('No se pudo actualizar tu perfil. Intenta de nuevo.');
                },
            });
            return;
        }

        if (shouldSyncImage && imagePayload) {
            this.patchProfileImage(user.id, imagePayload, user);
        }
    }

    getCurrentUserImage(): string | undefined {
        return this.currentUser?.image;
    }

    getCurrentUserInitial(): string {
        const name = this.currentUser?.name?.trim();
        if (name) {
            return name.charAt(0).toUpperCase();
        }

        const username = this.currentUser?.username?.trim();
        return username ? username.charAt(0).toUpperCase() : '?';
    }

    private patchProfileImage(userId: number, image: string, fallbackUser: HouseUserResponse['user']): void {
        this.api.updateUserImage(userId, { image }).subscribe({
            next: (updatedUser) => this.applyUpdatedUser(updatedUser),
            error: () => {
                this.api.getUser(userId).subscribe({
                    next: (freshUser) => this.applyUpdatedUser(freshUser),
                    error: () => this.applyUpdatedUser(fallbackUser),
                });
            },
        });
    }

    private getProfileImagePayload(): string | undefined {
        const croppedImage = this.profileCroppedImage()?.trim();
        if (this.profileImageFile()) {
            return croppedImage || undefined;
        }

        const image = this.profileForm.image?.trim();
        if (!image) {
            return undefined;
        }

        if (/^data:/i.test(image)) {
            return image;
        }

        return this.extractImageUuid(image);
    }

    private extractImageUuid(image: string): string {
        const sanitized = image.split('?')[0].split('#')[0];
        const parts = sanitized.split('/').filter(Boolean);
        return parts.length ? parts[parts.length - 1] : image;
    }

    private resetProfilePinFlow(): void {
        this.showProfilePinModal.set(false);
        this.profilePinMode.set('validate');
        this.profilePinContext.set('change');
        this.profilePinSubmitting.set(false);
        this.profilePinError.set('');
        this.profilePinCurrent = '';
        this.profilePinNew = '';
        this.profilePinConfirm = '';
        this.showProfilePinCurrent = false;
        this.showProfilePinNew = false;
        this.showProfilePinConfirm = false;
    }

    private normalizePinValue(value: string): string {
        return value.replace(/\D/g, '').slice(0, this.pinSlotCount);
    }

    private queueProfilePinCurrentFocus(): void {
        setTimeout(() => {
            this.focusProfilePinCurrentInput();
        }, 60);
    }

    private queueProfilePinNewFocus(): void {
        setTimeout(() => {
            this.focusProfilePinNewInput();
        }, 60);
    }

    private queueProfilePinConfirmFocus(): void {
        setTimeout(() => {
            this.focusProfilePinConfirmInput();
        }, 60);
    }

    private openRefreshPinModal(): void {
        this.resetProfilePinFlow();
        this.profilePinContext.set('reauth');
        this.showProfilePinModal.set(true);
        this.queueProfilePinCurrentFocus();
    }

    private startClockTicker(): void {
        this.currentClockMs.set(Date.now());
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }

        this.clockInterval = setInterval(() => {
            this.currentClockMs.set(Date.now());
        }, 30000);
    }

    private toMinutesOfDay(value: string): number | null {
        const [hourRaw, minuteRaw] = value.split(':');
        const hour = Number.parseInt(hourRaw ?? '', 10);
        const minute = Number.parseInt(minuteRaw ?? '', 10);

        if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
            return null;
        }

        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return null;
        }

        return hour * 60 + minute;
    }

    private loadDashboardSession(): void {
        this.loadMembers();
        this.loadDashboard();
        this.loadSessionPoints();
    }

    private shouldRequireRefreshPin(): boolean {
        if (this.isFromSelectUserNavigation()) {
            return false;
        }

        if (!this.isReloadNavigation()) {
            return false;
        }

        const roleId = this.getCurrentUserRoleId();
        return roleId === ROLE_OWNER || roleId === ROLE_ADMIN;
    }

    private getCurrentUserRoleId(): number {
        const userId = this.currentUser?.id;
        if (!userId) {
            return 0;
        }

        const storedMember = this.state.houseMembers().find((member) => member.userId === userId);
        if (storedMember) {
            return storedMember.roleId;
        }

        const loadedMember = this.members().find((member) => member.userId === userId);
        return loadedMember?.roleId ?? 0;
    }

    private isReloadNavigation(): boolean {
        if (typeof performance === 'undefined') {
            return false;
        }

        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        if (navigationEntry?.type) {
            return navigationEntry.type === 'reload';
        }

        const legacyNavigation = (performance as Performance & { navigation?: { type?: number } }).navigation;
        return legacyNavigation?.type === 1;
    }

    private isFromSelectUserNavigation(): boolean {
        const fromCurrentNavigation = this.router.getCurrentNavigation()?.extras.state?.['fromSelectUser'];
        if (fromCurrentNavigation === true) {
            return true;
        }

        const fromHistoryState = (history.state as { fromSelectUser?: unknown } | undefined)?.fromSelectUser;
        return fromHistoryState === true;
    }

    private applyUpdatedUser(updatedUser: HouseUserResponse['user']): void {
        this.state.setCurrentUser(updatedUser);
        this.houseUsers.update((members) =>
            members.map((member) =>
                member.userId === updatedUser.id
                    ? {
                        ...member,
                        user: updatedUser,
                    }
                    : member
            )
        );
        this.savingProfile.set(false);
        this.showProfileModal.set(false);
    }

    openEditModal(task: DashboardTaskInstanceResponse): void {
        if (!this.isAdmin) {
            return;
        }

        this.taskForm = this.buildTaskFormFromTask(task, task.assignedTo ?? 0);
        this.cloningTask.set(false);

        this.editingTaskId.set(task.taskId);
        this.normalizeRecurrenceByDateRange();
        this.createTaskError.set('');
        this.showCreateModal.set(true);
        this.focusTitleInput();
    }

    openCloneModal(task: DashboardTaskInstanceResponse): void {
        if (!this.isAdmin) {
            return;
        }

        const preferredUserId = this.selectedUserId() ?? task.assignedTo ?? 0;
        this.taskForm = this.buildTaskFormFromTask(task, preferredUserId);
        this.cloningTask.set(true);
        this.editingTaskId.set(null);
        this.normalizeRecurrenceByDateRange();
        this.createTaskError.set('');
        this.showCreateModal.set(true);
        this.focusTitleInput();
    }

    closeCreateModal(): void {
        this.showCreateModal.set(false);
        this.creatingTask.set(false);
        this.createTaskError.set('');
        this.editingTaskId.set(null);
        this.cloningTask.set(false);
        this.taskColorPickerOpen = false;
    }

    submitTask(): void {
        if (!this.isAdmin) {
            this.createTaskError.set('Solo admin o owner pueden crear/editar tareas.');
            return;
        }

        if (!this.taskForm.title.trim()) {
            this.createTaskError.set('El título de la tarea es obligatorio.');
            return;
        }

        if (this.taskForm.startDate && this.taskForm.endDate && this.taskForm.endDate < this.taskForm.startDate) {
            this.createTaskError.set('La fecha fin no puede ser menor a la fecha inicio.');
            return;
        }

        if ((this.taskForm.recurrenceDays?.length ?? 0) === 0) {
            this.createTaskError.set('Selecciona al menos un día recurrente.');
            return;
        }

        this.creatingTask.set(true);
        this.createTaskError.set('');

        const editingTaskId = this.editingTaskId();
        const request$ = editingTaskId
            ? this.api.updateTask(editingTaskId, this.buildUpdatePayload())
            : this.api.createTask(this.taskForm);

        request$.subscribe({
            next: () => {
                this.creatingTask.set(false);
                this.showCreateModal.set(false);
                this.editingTaskId.set(null);
                this.cloningTask.set(false);
                this.skipNextDashboardAutoScroll = true;
                this.loadDashboard();
            },
            error: () => {
                this.creatingTask.set(false);
                this.createTaskError.set(
                    editingTaskId
                        ? 'No se pudo actualizar la tarea. Intenta de nuevo.'
                        : 'No se pudo crear la tarea. Intenta de nuevo.'
                );
            },
        });
    }

    async onGalleryImageSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
            this.taskForm.image = await this.compressImageToBase64(file);
        } catch {
            this.createTaskError.set('No se pudo procesar la imagen seleccionada.');
        } finally {
            input.value = '';
        }
    }

    async onCameraImageSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
            this.taskForm.image = await this.compressImageToBase64(file);
        } catch {
            this.createTaskError.set('No se pudo procesar la foto de la cámara.');
        } finally {
            input.value = '';
        }
    }

    clearSelectedImage(): void {
        this.taskForm.image = undefined;
    }

    onCustomTaskColorChanged(color: string): void {
        if (!color?.trim()) {
            return;
        }
        this.taskForm.color = color.trim();
    }

    onCustomTaskColorAccepted(color: string): void {
        this.onCustomTaskColorChanged(color);
        this.taskColorPickerOpen = false;
    }

    onCustomTaskColorCanceled(): void {
        this.taskColorPickerOpen = false;
    }

    toggleRecurrenceDay(day: RecurrenceDay): void {
        if (!this.isRecurrenceDayEnabled(day)) {
            return;
        }

        const current = [...(this.taskForm.recurrenceDays ?? [])];
        const index = current.indexOf(day);

        if (index >= 0) {
            current.splice(index, 1);
        } else {
            current.push(day);
        }

        this.taskForm.recurrenceDays = current;
    }

    isRecurrenceDaySelected(day: RecurrenceDay): boolean {
        return !!this.taskForm.recurrenceDays?.includes(day);
    }

    onDateRangeChanged(): void {
        this.createTaskError.set('');

        const today = this.todayIsoDate();

        if (!this.taskForm.startDate) {
            this.taskForm.startDate = today;
        }

        if (this.taskForm.startDate < today) {
            this.taskForm.startDate = today;
        }

        if (this.taskForm.endDate && this.taskForm.endDate < today) {
            this.taskForm.endDate = today;
        }

        if (!this.taskForm.endDate || this.taskForm.endDate < this.taskForm.startDate) {
            this.taskForm.endDate = this.taskForm.startDate;
        }

        this.normalizeRecurrenceByDateRange();
    }

    isRecurrenceDayEnabled(day: RecurrenceDay): boolean {
        return this.getAllowedRecurrenceDays().includes(day);
    }

    getAllowedRangeDaysCount(): number {
        const start = this.taskForm.startDate;
        const end = this.taskForm.endDate;

        if (!start || !end) {
            return 1;
        }

        const startDate = new Date(`${start}T00:00:00`);
        const endDate = new Date(`${end}T00:00:00`);
        const diffMs = endDate.getTime() - startDate.getTime();

        if (Number.isNaN(diffMs) || diffMs < 0) {
            return 1;
        }

        return Math.min(7, Math.floor(diffMs / 86400000) + 1);
    }

    getMinTaskStartDate(): string {
        return this.todayIsoDate();
    }

    getMinTaskEndDate(): string {
        const today = this.todayIsoDate();
        const start = this.taskForm.startDate || today;
        return start > today ? start : today;
    }

    getAssignedUserLabel(userId: number): string {
        if (!userId) return 'Sin asignar';
        const member = this.houseUsers().find((item) => item.userId === userId);
        return member ? member.user.username : `ID: ${userId}`;
    }

    shouldShowAssignedUser(): boolean {
        return this.isAdmin && this.selectedUserId() === null;
    }

    getCurrentUsername(): string {
        return this.currentUser?.username || 'usuario';
    }

    getCurrentUserRoleLabel(): string {
        return roleName(this.userRole);
    }

    getCurrentSessionLabel(): string {
        const username = this.currentUser?.username;
        return username ? `@${username}` : 'Sin usuario';
    }

    getCurrentHeaderIdentity(): string {
        const username = this.currentUser?.username?.trim() || 'usuario';
        const houseName = this.currentHouse?.name?.trim() || 'casa';
        return `${username}@${houseName}`;
    }

    getCurrentTimeAmPm(): string {
        const now = new Date(this.currentClockMs());
        return now.toLocaleTimeString('es-MX', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    }

    getTodayPoints(): number {
        return this.animatedTodayPoints();
    }

    getMonthPoints(): number {
        return this.animatedMonthPoints();
    }

    canCompleteTask(task: DashboardTaskInstanceResponse): boolean {
        const currentUserId = this.currentUser?.id;
        return !!currentUserId && !!task.assignedTo && task.assignedTo === currentUserId;
    }

    isEditingTask(): boolean {
        return this.editingTaskId() !== null;
    }

    toggleTaskComplete(task: DashboardTaskInstanceResponse): void {
        if (!this.canCompleteTask(task)) {
            return;
        }

        if (this.isTaskLoading(task.id)) {
            return;
        }

        this.setTaskLoading(task.id, true);

        const request$ = task.completed
            ? this.api.uncompleteTaskInstance(task.id)
            : this.api.completeTaskInstance(task.id, { userId: this.currentUser?.id ?? task.assignedTo ?? 0 });

        request$.subscribe({
            next: () => {
                this.setTaskLoading(task.id, false);
                if (!task.completed) {
                    this.triggerTaskFireworks();
                }
                this.loadDashboard();
                this.loadSessionPoints();
            },
            error: () => {
                this.setTaskLoading(task.id, false);
            },
        });
    }

    deleteTask(task: DashboardTaskInstanceResponse): void {
        const taskId = task.taskId ?? task.id;
        if (!this.isAdmin || !taskId || this.isTaskDeleting(taskId)) {
            return;
        }

        this.openConfirmModal({
            title: 'Eliminar tarea',
            message: `¿Eliminar la tarea "${task.title}"?`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            onConfirm: () => {
                this.setTaskDeleting(taskId, true);
                this.api.deleteTask(taskId).subscribe({
                    next: () => {
                        this.setTaskDeleting(taskId, false);
                        this.loadDashboard();
                        this.loadSessionPoints();
                    },
                    error: () => {
                        this.setTaskDeleting(taskId, false);
                        this.openInfoModal('Error', 'No se pudo eliminar la tarea. Intenta de nuevo.');
                    },
                });
            },
        });
    }

    isTaskLoading(taskId: number): boolean {
        return !!this.completingTaskIds()[taskId];
    }

    isTaskDeleting(taskId: number): boolean {
        return !!this.deletingTaskIds()[taskId];
    }

    getTaskBackgroundColor(task: DashboardTaskInstanceResponse): { backgroundColor: string } {
        return { backgroundColor: task.color || '#ede9fe' };
    }

    getAllCompletedMessage(): string {
        return '¡Excelente trabajo! Completaste todas las tareas de este día.';
    }

    getFormattedTaskTime(task: DashboardTaskInstanceResponse): string {
        const startTime = task.startTime;
        if (!startTime) {
            return '—';
        }

        const durationMinutes = task.durationMinutes ?? 0;
        if (durationMinutes <= 0) {
            return startTime;
        }

        const startMinutes = this.toMinutesOfDay(startTime);
        if (startMinutes === null) {
            return startTime;
        }

        const minutesInDay = 24 * 60;
        const endMinutes = (startMinutes + durationMinutes) % minutesInDay;
        const endHour = Math.floor(endMinutes / 60);
        const endMinute = endMinutes % 60;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

        return `${startTime} - ${endTime}`;
    }

    shouldShowTaskProgress(task: DashboardTaskInstanceResponse): boolean {
        if (task.completed) {
            return false;
        }

        if (!this.isSelectedDateToday()) {
            return false;
        }

        const duration = task.durationMinutes ?? 0;
        if (!task.startTime || duration <= 0) {
            return false;
        }

        const now = new Date(this.currentClockMs());
        const startMinutes = this.toMinutesOfDay(task.startTime);
        if (startMinutes === null) {
            return false;
        }

        return Math.floor(startMinutes / 60) <= now.getHours();
    }

    getTaskProgressPercent(task: DashboardTaskInstanceResponse): number {
        if (task.completed) {
            return 100;
        }

        const duration = task.durationMinutes ?? 0;
        if (!task.startTime || duration <= 0) {
            return 0;
        }

        const startMinutes = this.toMinutesOfDay(task.startTime);
        if (startMinutes === null) {
            return 0;
        }

        const now = new Date(this.currentClockMs());
        const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
        const elapsed = nowMinutes - startMinutes;
        const percent = (elapsed / duration) * 100;

        return Math.max(0, Math.min(100, percent));
    }

    getTaskProgressText(task: DashboardTaskInstanceResponse): string {
        const duration = task.durationMinutes ?? 0;
        if (!task.startTime || duration <= 0) {
            return '';
        }

        if (task.completed) {
            return `${duration}m / ${duration}m · faltan 0m`;
        }

        const startMinutes = this.toMinutesOfDay(task.startTime);
        if (startMinutes === null) {
            return '';
        }

        const now = new Date(this.currentClockMs());
        const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
        const elapsed = Math.max(0, Math.min(duration, Math.floor(nowMinutes - startMinutes)));
        const remaining = Math.max(0, duration - elapsed);

        return `${elapsed}m / ${duration}m · faltan ${remaining}m`;
    }

    getTaskProgressColorClass(task: DashboardTaskInstanceResponse): string {
        const startMinutes = this.toMinutesOfDay(task.startTime ?? '');
        if (startMinutes !== null) {
            const now = new Date(this.currentClockMs());
            if (Math.floor(startMinutes / 60) < now.getHours()) {
                return 'task-progress-fill--red';
            }
        }

        const pct = this.getTaskProgressPercent(task);
        if (pct >= 80) return 'task-progress-fill--red';
        if (pct >= 50) return 'task-progress-fill--yellow';
        return 'task-progress-fill--green';
    }

    logout(): void {
        this.state.setCurrentUser(null);
        this.router.navigate(['/onboarding/select-user'], { replaceUrl: true });
    }

    formatDate(date: Date): string {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const dayName = days[date.getDay()];
        const day = date.getDate();
        const monthName = months[date.getMonth()];
        return `${dayName} ${day} de ${monthName}`;
    }

    trackByHour(_: number, slot: TimeSlot): number {
        return slot.hour;
    }

    isCurrentHour(hour: number): boolean {
        const now = new Date(this.currentClockMs());
        return this.isSelectedDateToday() && now.getHours() === hour;
    }

    isPastHourWithPendingTasks(slot: TimeSlot): boolean {
        if (!this.isSelectedDateToday()) {
            return false;
        }

        const now = new Date(this.currentClockMs());
        const currentHour = now.getHours();
        if (slot.hour >= currentHour) {
            return false;
        }

        return slot.tasks.some((task) => !task.completed);
    }

    trackByTask(_: number, task: DashboardTaskInstanceResponse): number {
        return task.id;
    }

    trackByHouseUser(_: number, member: HouseUserResponse): number {
        return member.id;
    }

    closeAlertModal(): void {
        this.showAlertModal.set(false);
        this.alertModalAction = null;
    }

    onEscapeKey(): void {
        if (this.taskImagePreview()) {
            this.closeTaskImagePreview();
            return;
        }

        if (this.showAlertModal()) {
            this.closeAlertModal();
            return;
        }

        if (this.showProfilePinModal()) {
            this.closeProfilePinModal();
            return;
        }

        if (this.showProfileModal()) {
            this.closeProfileModal();
            return;
        }

        if (this.showMembersModal()) {
            this.closeMembersModal();
            return;
        }

        if (this.showCreateModal()) {
            this.closeCreateModal();
        }
    }

    confirmAlertModal(): void {
        const action = this.alertModalAction;
        this.closeAlertModal();
        action?.();
    }

    private setTaskLoading(taskId: number, loading: boolean): void {
        const current = { ...this.completingTaskIds() };
        if (loading) {
            current[taskId] = true;
        } else {
            delete current[taskId];
        }
        this.completingTaskIds.set(current);
    }

    private setTaskDeleting(taskId: number, loading: boolean): void {
        const current = { ...this.deletingTaskIds() };
        if (loading) {
            current[taskId] = true;
        } else {
            delete current[taskId];
        }
        this.deletingTaskIds.set(current);
    }

    private triggerTaskFireworks(): void {
        const bursts = 8;
        const particlesPerBurst = 22;
        const particles: FireworkParticle[] = [];

        for (let burstIndex = 0; burstIndex < bursts; burstIndex++) {
            const originX = 6 + Math.random() * 88;
            const originY = 8 + Math.random() * 72;

            for (let particleIndex = 0; particleIndex < particlesPerBurst; particleIndex++) {
                const angle = (Math.PI * 2 * particleIndex) / particlesPerBurst;
                const radius = 80 + Math.random() * 140;
                particles.push({
                    x: originX,
                    y: originY,
                    dx: Math.cos(angle) * radius,
                    dy: Math.sin(angle) * radius,
                    hue: Math.round(Math.random() * 360),
                    delay: Math.round(Math.random() * 720),
                });
            }
        }

        this.screenFireworks.set(particles);
        this.showScreenFireworks.set(true);

        if (this.fireworksTimeout) {
            clearTimeout(this.fireworksTimeout);
        }
        this.fireworksTimeout = setTimeout(() => {
            this.showScreenFireworks.set(false);
            this.screenFireworks.set([]);
        }, 2500);
    }

    private animatePointsCounters(targetToday: number, targetMonth: number): void {
        if (this.todayPointsRaf) {
            cancelAnimationFrame(this.todayPointsRaf);
        }
        if (this.monthPointsRaf) {
            cancelAnimationFrame(this.monthPointsRaf);
        }

        this.todayPointsRaf = this.animateCounter(
            this.animatedTodayPoints(),
            targetToday,
            620,
            (value) => this.animatedTodayPoints.set(value)
        );

        this.monthPointsRaf = this.animateCounter(
            this.animatedMonthPoints(),
            targetMonth,
            760,
            (value) => this.animatedMonthPoints.set(value)
        );
    }

    private animateCounter(
        from: number,
        to: number,
        durationMs: number,
        onValue: (value: number) => void
    ): number | undefined {
        if (from === to) {
            onValue(to);
            return undefined;
        }

        const start = performance.now();
        const delta = to - from;

        const step = (now: number): void => {
            const progress = Math.min(1, (now - start) / durationMs);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(from + delta * eased);
            onValue(current);

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                onValue(to);
            }
        };

        return requestAnimationFrame(step);
    }

    private formatHour(hour: number): string {
        return `${String(hour).padStart(2, '0')}:00`;
    }

    private getAllowedRecurrenceDays(): RecurrenceDay[] {
        const count = this.getAllowedRangeDaysCount();
        if (count >= 7) {
            return [...this.recurrenceDays];
        }

        const start = this.taskForm.startDate || this.todayIsoDate();
        const startDate = new Date(`${start}T00:00:00`);
        const startDayCode = this.toRecurrenceDay(startDate.getDay());
        const startIndex = this.recurrenceDays.indexOf(startDayCode);

        if (startIndex < 0) {
            return [this.recurrenceDays[0]];
        }

        const allowed: RecurrenceDay[] = [];
        for (let i = 0; i < count; i++) {
            allowed.push(this.recurrenceDays[(startIndex + i) % 7]);
        }
        return allowed;
    }

    private normalizeRecurrenceByDateRange(): void {
        const allowed = this.getAllowedRecurrenceDays();
        const current = this.taskForm.recurrenceDays ?? [];
        const filtered = current.filter((day): day is RecurrenceDay => allowed.includes(day));

        this.taskForm.recurrenceDays = filtered.length > 0 ? filtered : [allowed[0]];
    }

    private focusTitleInput(): void {
        setTimeout(() => {
            this.titleInput?.nativeElement.focus();
        }, 0);
    }

    private todayIsoDate(): string {
        return this.toIsoDate(new Date());
    }

    private toRecurrenceDay(jsDay: number): RecurrenceDay {
        const map: RecurrenceDay[] = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
        return map[jsDay] ?? 'LUN';
    }

    private buildUpdatePayload(): UpdateTaskRequest {
        return {
            title: this.taskForm.title,
            description: this.taskForm.description,
            startDate: this.taskForm.startDate,
            endDate: this.taskForm.endDate,
            startTime: this.taskForm.startTime,
            durationMinutes: this.taskForm.durationMinutes,
            recurrenceDays: this.taskForm.recurrenceDays,
            pointsReward: this.taskForm.pointsReward,
            priority: this.taskForm.priority,
            color: this.taskForm.color,
            userId: this.taskForm.userId,
            image: this.taskForm.image,
        };
    }

    private buildTaskFormFromTask(task: DashboardTaskInstanceResponse, userId: number): CreateTaskRequest {
        const house = this.currentHouse;
        const recurrence = (task.recurrenceDays ?? []).filter((day): day is RecurrenceDay =>
            this.recurrenceDays.includes(day as RecurrenceDay)
        );

        return {
            houseId: house?.id ?? 0,
            title: task.title,
            description: task.description || '',
            startDate: task.startDate || this.todayIsoDate(),
            endDate: task.endDate || task.startDate || this.todayIsoDate(),
            startTime: task.startTime || '08:00',
            durationMinutes: task.durationMinutes ?? 30,
            recurrenceDays: recurrence,
            pointsReward: task.pointsReward ?? 10,
            priority: task.priority ?? 2,
            color: task.color || '#ede9fe',
            userId,
            image: task.image,
        };
    }

    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('No se pudo convertir la imagen a base64'));
            reader.readAsDataURL(file);
        });
    }

    private compressImageToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const maxWidth = 1280;
                    const maxHeight = 1280;

                    let { width, height } = img;

                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const context = canvas.getContext('2d');
                    if (!context) {
                        reject(new Error('No se pudo comprimir la imagen'));
                        return;
                    }

                    context.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.72));
                };

                img.onerror = () => reject(new Error('No se pudo leer la imagen de cámara'));
                img.src = String(reader.result);
            };

            reader.onerror = () => reject(new Error('No se pudo cargar la imagen de cámara'));
            reader.readAsDataURL(file);
        });
    }

    private getDefaultTaskForm(): CreateTaskRequest {
        const house = this.currentHouse;
        const today = this.todayIsoDate();
        const todayDay = this.toRecurrenceDay(new Date(`${today}T00:00:00`).getDay());

        return {
            houseId: house?.id ?? 0,
            title: '',
            description: '',
            startDate: today,
            endDate: today,
            startTime: '08:00',
            durationMinutes: 30,
            recurrenceDays: [todayDay],
            pointsReward: 10,
            priority: 2,
            color: '#ede9fe',
            userId: this.isAdmin ? this.selectedUserId() ?? 0 : this.currentUser?.id ?? 0,
        };
    }

    // ======= Member Management Methods =======

    openMembersModal(): void {
        if (!this.isOwner) {
            return;
        }
        this.searchQuery.set('');
        this.searchResults.set([]);
        this.updatingMemberId.set(null);
        this.managingRoleId.set(null);
        this.showMembersModal.set(true);
    }

    closeMembersModal(): void {
        this.showMembersModal.set(false);
        this.searchQuery.set('');
        this.searchResults.set([]);
        this.updatingMemberId.set(null);
        this.managingRoleId.set(null);
    }

    searchUsersToAdd(): void {
        const username = this.searchQuery().replace(/\s+/g, '').trim();
        if (!username || username.length < 3) {
            this.searchResults.set([]);
            this.searching.set(false);
            return;
        }

        this.searching.set(true);
        this.api.searchUsers(username).subscribe({
            next: (users) => {
                const existingUserIds = this.houseUsers().map((hu) => hu.userId);
                this.searchResults.set(users.filter((u) => !existingUserIds.includes(u.id)));
                this.searching.set(false);
            },
            error: () => {
                this.searchResults.set([]);
                this.searching.set(false);
            },
        });
    }

    hasSearchMinLength(): boolean {
        return this.searchQuery().replace(/\s+/g, '').trim().length >= 3;
    }

    addUserToHouse(userId: number, roleId: number): void {
        const house = this.currentHouse;
        if (!house) return;

        this.api.addMember(house.id, { userId, roleId }).subscribe({
            next: () => {
                this.loadMembers();
                this.searchQuery.set('');
                this.searchResults.set([]);
            },
            error: () => {
                this.openInfoModal('Error', 'No se pudo agregar el usuario. Intenta de nuevo.');
            },
        });
    }

    startEditingMemberRole(memberId: number, currentRoleId: number): void {
        this.updatingMemberId.set(memberId);
        this.managingRoleId.set(currentRoleId);
    }

    cancelEditingMember(): void {
        this.updatingMemberId.set(null);
        this.managingRoleId.set(null);
    }

    updateMemberRole(houseId: number, userId: number): void {
        const newRoleId = this.managingRoleId();
        if (!newRoleId || newRoleId === 0) return;

        this.api.updateMemberRole(houseId, userId, { roleId: newRoleId }).subscribe({
            next: () => {
                this.loadMembers();
                this.updatingMemberId.set(null);
                this.managingRoleId.set(null);
            },
            error: () => {
                this.openInfoModal('Error', 'No se pudo actualizar el rol. Intenta de nuevo.');
            },
        });
    }

    removeMember(houseId: number, userId: number): void {
        const user = this.houseUsers().find((hu) => hu.userId === userId);
        if (!user) return;

        this.openConfirmModal({
            title: 'Eliminar usuario',
            message: `¿Estás seguro de que quieres eliminar a @${user.user.username}?`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            onConfirm: () => {
                this.api.deleteMember(houseId, userId).subscribe({
                    next: () => {
                        this.loadMembers();
                    },
                    error: () => {
                        this.openInfoModal('Error', 'No se pudo eliminar el usuario. Intenta de nuevo.');
                    },
                });
            },
        });
    }

    getRoleLabel(roleId: number): string {
        return roleName(roleId);
    }

    // ======= Create New User Methods =======

    openCreateUserForm(): void {
        this.resetNewUserForm();
        this.createUserError.set('');
        this.showCreateUserForm.set(true);
    }

    closeCreateUserForm(): void {
        this.showCreateUserForm.set(false);
        this.resetNewUserForm();
        this.createUserError.set('');
    }

    resetNewUserForm(): void {
        this.newUserForm.set({
            name: '',
            email: '',
            username: '',
            roleForNewHouse: 3,
        });
    }

    submitNewUser(): void {
        const form = this.newUserForm();

        // Validaciones
        if (!form.name.trim()) {
            this.createUserError.set('El nombre es obligatorio.');
            return;
        }

        if (!form.email.trim() || !this.isValidEmail(form.email)) {
            this.createUserError.set('Email inválido.');
            return;
        }

        if (!form.username.trim()) {
            this.createUserError.set('El nombre de usuario es obligatorio.');
            return;
        }

        if (form.username.length < 3) {
            this.createUserError.set('El nombre de usuario debe tener al menos 3 caracteres.');
            return;
        }

        this.creatingNewUser.set(true);
        this.createUserError.set('');

        const createUserRequest: CreateUserRequest = {
            name: form.name.trim(),
            email: form.email.trim(),
            username: form.username.trim(),
        };

        this.api.createUser(createUserRequest).subscribe({
            next: (newUser) => {
                this.creatingNewUser.set(false);
                this.addUserToHouse(newUser.id, form.roleForNewHouse);
                this.closeCreateUserForm();
            },
            error: (err) => {
                this.creatingNewUser.set(false);
                const errorMessage = err?.error?.message || 'No se pudo crear el usuario. Intenta de nuevo.';
                this.createUserError.set(errorMessage);
            },
        });
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private openInfoModal(title: string, message: string): void {
        this.alertModalTitle.set(title);
        this.alertModalMessage.set(message);
        this.alertModalConfirmOnly.set(true);
        this.alertModalConfirmText.set('Aceptar');
        this.alertModalCancelText.set('');
        this.alertModalAction = null;
        this.showAlertModal.set(true);
    }

    private openConfirmModal(config: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
    }): void {
        this.alertModalTitle.set(config.title);
        this.alertModalMessage.set(config.message);
        this.alertModalConfirmOnly.set(false);
        this.alertModalConfirmText.set(config.confirmText ?? 'Confirmar');
        this.alertModalCancelText.set(config.cancelText ?? 'Cancelar');
        this.alertModalAction = config.onConfirm;
        this.showAlertModal.set(true);
    }

    get colors(): string[] {
        return ['#ede9fe', '#dbeafe', '#dcfce7', '#fef3c7', '#fed7aa', '#fee2e2', '#f3e8ff'];
    }

    openTaskImagePreview(url: string): void {
        this.taskImagePreview.set(url);
    }

    closeTaskImagePreview(): void {
        this.taskImagePreview.set(null);
    }

    scrollToRelevantSlot(): void {
        if (!this.tasks.length) {
            this.scrollWindowTo(0);
            return;
        }

        if (this.showAllCompletedMessage()) {
            this.scrollWindowTo(0);
            return;
        }

        const firstPendingTask = this.timeSlots.flatMap((slot) => slot.tasks).find((task) => !task.completed);
        if (firstPendingTask) {
            const firstPendingTaskEl = document.getElementById(`task-${firstPendingTask.id}`);
            if (firstPendingTaskEl) {
                const top = firstPendingTaskEl.getBoundingClientRect().top + window.scrollY - this.getStickyOffset() - 16;
                this.scrollWindowTo(top);
                return;
            }
        }

        const targetSlot =
            this.timeSlots.find((slot) => slot.tasks.some((task) => !task.completed)) ??
            this.timeSlots.find((slot) => slot.tasks.length > 0) ??
            this.timeSlots[0];

        if (!targetSlot) {
            this.scrollWindowTo(0);
            return;
        }

        const el = document.getElementById(`slot-${targetSlot.hour}`);
        if (!el) {
            this.scrollWindowTo(0);
            return;
        }

        const top = el.getBoundingClientRect().top + window.scrollY - this.getStickyOffset() - 16;
        this.scrollWindowTo(top);
    }

    private getStickyOffset(): number {
        const header = document.querySelector('.dashboard-header')?.getBoundingClientRect().height ?? 0;
        const dateNav = document.querySelector('.date-nav-wrapper')?.getBoundingClientRect().height ?? 0;
        return header + dateNav;
    }

    private scrollWindowTo(targetTop: number): void {
        const maxScrollable = this.getMaxScrollableY();
        if (maxScrollable <= 140) {
            return;
        }

        const boundedTop = Math.max(0, Math.min(targetTop, maxScrollable));
        const distance = Math.abs(window.scrollY - boundedTop);
        if (distance < 12) {
            return;
        }

        if (distance < 120) {
            window.scrollTo({ top: boundedTop, behavior: 'auto' });
            return;
        }

        window.scrollTo({ top: boundedTop, behavior: 'smooth' });
    }

    private getMaxScrollableY(): number {
        const doc = document.documentElement;
        return Math.max(0, doc.scrollHeight - window.innerHeight);
    }

    private autoScrollToRelevantSlotIfNeeded(): void {
        const context = `${this.formatDashboardRequestDate(this.selectedDate())}|${this.selectedUserId() ?? 'all'}`;

        if (this.lastAutoScrollContext === context) {
            return;
        }

        this.lastAutoScrollContext = context;
        this.scrollToRelevantSlot();
    }

    private updateAllCompletedStatusAndCelebrate(dashboard: DashboardResponse, dashboardUserId?: number): void {
        const sessionUserId = this.currentUser?.id;
        const isSessionUserView = !!sessionUserId && dashboardUserId === sessionUserId;

        if (!isSessionUserView) {
            this.showAllCompletedMessage.set(false);
            if (this.showScreenFireworks()) {
                this.showScreenFireworks.set(false);
                this.screenFireworks.set([]);
            }
            return;
        }

        const tasks = dashboard.todayInstances ?? [];
        const allCompleted = tasks.length > 0 && tasks.every((task) => task.completed);
        this.showAllCompletedMessage.set(allCompleted);

        const context = `${this.formatDashboardRequestDate(this.selectedDate())}|${sessionUserId}`;
        if (!allCompleted) {
            if (this.lastCompletionCelebrationContext === context) {
                this.lastCompletionCelebrationContext = undefined;
            }
            return;
        }

        if (this.lastCompletionCelebrationContext === context) {
            return;
        }

        this.lastCompletionCelebrationContext = context;
        this.triggerTaskFireworks();
    }

    private startInactivityTimer(): void {
        this.lastActivityEventAt = Date.now();
        this.resetInactivityTimer();
    }

    private resetInactivityTimer(): void {
        this.clearInactivityTimer();
        this.inactivityTimeout = setTimeout(() => {
            this.logout();
        }, this.inactivityTimeoutMs);
    }

    private clearInactivityTimer(): void {
        if (!this.inactivityTimeout) {
            return;
        }

        clearTimeout(this.inactivityTimeout);
        this.inactivityTimeout = undefined;
    }

    private isSelectedDateToday(): boolean {
        return this.toIsoDate(this.selectedDate()) === this.toIsoDate(new Date());
    }

    private shiftSelectedDate(days: number): void {
        const nextDate = new Date(this.selectedDate());
        nextDate.setDate(nextDate.getDate() + days);
        this.selectedDate.set(nextDate);
        this.loadDashboard();
    }

    private formatDashboardRequestDate(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}${month}${year}`;
    }

    private toIsoDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
