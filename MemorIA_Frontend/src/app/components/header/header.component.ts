import {
    Component, OnInit, OnDestroy, inject, signal, computed, HostListener, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { CurrentUserService, UserRole } from '../../services/current-user.service';
import { environment } from '../../../environments/environment';

interface UserOption {
    id: number;
    nom: string;
    prenom: string;
    displayName: string;
    role: UserRole;
    roleLabel: string;
    initials: string;
}

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, FormsModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './header.component.html',
    styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
    private notifService  = inject(NotificationService);
    readonly userService  = inject(CurrentUserService);
    private router        = inject(Router);
    private http          = inject(HttpClient);

    searchQuery = signal('');

    // ── Notifications ────────────────────────────────────────────────────────────
    notifications  = signal<AppNotification[]>([]);
    showPanel      = signal(false);
    selectedNotif  = signal<AppNotification | null>(null);
    unreadCount    = computed(() => this.notifications().filter(n => !n.read).length);

    // ── User selector ─────────────────────────────────────────────────────────────
    showUserSelector = signal(false);
    userOptions      = signal<UserOption[]>([]);
    loadingUsers     = signal(false);

    private pollSub?: Subscription;
    private apiUrl = environment.apiUrl;

    readonly icons = {
        Search: 'Search',
        Bell: 'Bell',
        User: 'User',
        CheckCheck: 'CheckCheck',
        X: 'X',
        AlertTriangle: 'AlertTriangle',
        Clock: 'Clock',
        ClipboardCheck: 'ClipboardCheck',
        Activity: 'Activity',
        ChevronDown: 'ChevronDown',
        Stethoscope: 'Stethoscope',
        Heart: 'Heart',
        UserCheck: 'UserCheck'
    };

    ngOnInit() {
        const waitForUser = setInterval(() => {
            const user = this.userService.currentUser();
            if (user) {
                clearInterval(waitForUser);
                this.startPolling(user.id);
            }
        }, 300);
    }

    ngOnDestroy() {
        this.pollSub?.unsubscribe();
    }

    private startPolling(userId: number) {
        this.pollSub?.unsubscribe();
        this.pollSub = this.notifService.pollUnread(userId).subscribe({
            next: (notifs) => this.notifications.set(notifs),
            error: (err) => console.error('Notification polling error', err)
        });
    }

    // ── Notification panel ────────────────────────────────────────────────────────

    togglePanel(event: MouseEvent) {
        event.stopPropagation();
        this.showUserSelector.set(false);
        this.showPanel.update(v => !v);
        if (!this.showPanel()) this.selectedNotif.set(null);
    }

    closePanel() {
        this.showPanel.set(false);
        this.selectedNotif.set(null);
    }

    selectNotif(notif: AppNotification) {
        this.selectedNotif.set(notif);
        if (!notif.read) {
            this.notifService.markRead(notif.id).subscribe({
                next: (updated) => this.notifications.update(list =>
                    list.map(n => n.id === updated.id ? { ...n, read: true } : n))
            });
        }
    }

    backToList() {
        this.selectedNotif.set(null);
    }

    markAllRead(event: MouseEvent) {
        event.stopPropagation();
        const user = this.userService.currentUser();
        if (!user) return;
        this.notifService.markAllRead(user.id).subscribe({
            next: () => this.notifications.update(list => list.map(n => ({ ...n, read: true })))
        });
    }

    navigateTo(url: string, event: MouseEvent) {
        event.stopPropagation();
        this.closePanel();
        if (url) this.router.navigateByUrl(url);
    }

    // ── User selector ─────────────────────────────────────────────────────────────

    toggleUserSelector(event: MouseEvent) {
        event.stopPropagation();
        this.closePanel();
        const opening = !this.showUserSelector();
        this.showUserSelector.set(opening);
        if (opening && this.userOptions().length === 0) {
            this.loadAllUsers();
        }
    }

    closeUserSelector() {
        this.showUserSelector.set(false);
    }

    private loadAllUsers() {
        this.loadingUsers.set(true);
        const options: UserOption[] = [];
        let pending = 3;

        const done = () => {
            if (--pending === 0) {
                this.userOptions.set(options);
                this.loadingUsers.set(false);
            }
        };

        // Soignants
        this.http.get<any[]>(`${this.apiUrl}/assignations/soignants/all`).subscribe({
            next: (list) => {
                list.forEach(s => options.push({
                    id: s.id,
                    nom: s.nom ?? '',
                    prenom: s.prenom ?? '',
                    displayName: `Dr. ${s.prenom ?? ''} ${s.nom ?? ''}`.trim(),
                    role: 'SOIGNANT',
                    roleLabel: s.specialite ?? 'Médecin',
                    initials: this.buildInitials(s.prenom, s.nom)
                }));
                done();
            },
            error: () => done()
        });

        // Aidants
        this.http.get<any[]>(`${this.apiUrl}/aidant/all`).subscribe({
            next: (list) => {
                list.forEach(a => options.push({
                    id: a.id,
                    nom: a.nom ?? '',
                    prenom: a.prenom ?? '',
                    displayName: `${a.prenom ?? ''} ${a.nom ?? ''}`.trim(),
                    role: 'AIDANT',
                    roleLabel: a.relation ? `Aidant — ${a.relation}` : 'Aidant familial',
                    initials: this.buildInitials(a.prenom, a.nom)
                }));
                done();
            },
            error: () => done()
        });

        // Patients
        this.http.get<any[]>(`${this.apiUrl}/assignations/patients/all`).subscribe({
            next: (list) => {
                list.forEach(p => options.push({
                    id: p.id,
                    nom: p.nom ?? '',
                    prenom: p.prenom ?? '',
                    displayName: `${p.prenom ?? ''} ${p.nom ?? ''}`.trim(),
                    role: 'PATIENT',
                    roleLabel: 'Patient',
                    initials: this.buildInitials(p.prenom, p.nom)
                }));
                done();
            },
            error: () => done()
        });
    }

    selectUser(option: UserOption, event: MouseEvent) {
        event.stopPropagation();
        this.closeUserSelector();
        this.notifications.set([]);
        this.pollSub?.unsubscribe();
        this.userService.switchUser(option.role, option.id);
        // Restart polling for new user
        const wait = setInterval(() => {
            const user = this.userService.currentUser();
            if (user && user.id === option.id) {
                clearInterval(wait);
                this.startPolling(user.id);
            }
        }, 200);
    }

    isCurrentUser(option: UserOption): boolean {
        const cur = this.userService.currentUser();
        return !!cur && cur.id === option.id && cur.role === option.role;
    }

    getUsersByRole(role: UserRole): UserOption[] {
        return this.userOptions().filter(u => u.role === role);
    }

    // ── Helpers UI ───────────────────────────────────────────────────────────────

    getSeverityClass(severity: string): string {
        switch (severity) {
            case 'CRITICAL': return 'sev-critical';
            case 'WARNING':  return 'sev-warning';
            default:         return 'sev-info';
        }
    }

    getIcon(type: string): string {
        return this.notifService.getIcon(type);
    }

    getTypeLabel(type: string): string {
        return this.notifService.getTypeLabel(type);
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '';
        const d       = new Date(dateStr);
        const diffMs  = Date.now() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1)  return 'À l\'instant';
        if (diffMin < 60) return `Il y a ${diffMin} min`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24)   return `Il y a ${diffH}h`;
        const diffD = Math.floor(diffH / 24);
        if (diffD < 7)    return `Il y a ${diffD}j`;
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    }

    getZScoreColor(z: number | undefined): string {
        if (z == null) return '#6B7280';
        return z > -1 ? '#10B981' : z > -2 ? '#F59E0B' : '#EF4444';
    }

    getRoleAvatarClass(role: string): string {
        return `profile-avatar role-${role}`;
    }

    private buildInitials(prenom: string, nom: string): string {
        return ((prenom?.[0] ?? '') + (nom?.[0] ?? '')).toUpperCase();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.notif-wrapper') && this.showPanel()) {
            this.closePanel();
        }
        if (!target.closest('.profile-wrapper') && this.showUserSelector()) {
            this.closeUserSelector();
        }
    }
}
