import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type UserRole = 'SOIGNANT' | 'AIDANT' | 'PATIENT';

export interface CurrentUser {
    id: number;
    nom: string;
    prenom: string;
    displayName: string;
    role: UserRole;
    roleLabel: string;
    initials: string;
    specialite?: string;
    relation?: string;
}

const LS_ROLE_KEY = 'memoria_user_role';
const LS_ID_KEY   = 'memoria_user_id';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    currentUser = signal<CurrentUser | null>(null);
    loaded       = signal(false);

    constructor() {
        this.loadFromStorageOrDefault();
    }

    // ── Public API ──────────────────────────────────────────────────────────────

    /** Switch to a different user (persists in localStorage) */
    switchUser(role: UserRole, id: number) {
        localStorage.setItem(LS_ROLE_KEY, role);
        localStorage.setItem(LS_ID_KEY, String(id));
        this.loaded.set(false);
        this.currentUser.set(null);
        this.loadUser(role, id);
    }

    // ── Private loaders ────────────────────────────────────────────────────────

    private loadFromStorageOrDefault() {
        const storedRole = localStorage.getItem(LS_ROLE_KEY) as UserRole | null;
        const storedId   = localStorage.getItem(LS_ID_KEY);

        if (storedRole && storedId) {
            this.loadUser(storedRole, Number(storedId));
        } else {
            this.loadDefaultSoignant();
        }
    }

    private loadUser(role: UserRole, id: number) {
        switch (role) {
            case 'SOIGNANT': this.loadSoignant(id); break;
            case 'AIDANT':   this.loadAidant(id);   break;
            case 'PATIENT':  this.loadPatient(id);  break;
        }
    }

    private loadDefaultSoignant() {
        this.http.get<any[]>(`${this.apiUrl}/assignations/soignants/all`).subscribe({
            next: (list) => {
                if (list.length > 0) {
                    const s = list[0];
                    this.setSoignant(s);
                    localStorage.setItem(LS_ROLE_KEY, 'SOIGNANT');
                    localStorage.setItem(LS_ID_KEY, String(s.id));
                } else {
                    this.setFallback();
                }
            },
            error: () => this.setFallback()
        });
    }

    private loadSoignant(id: number) {
        this.http.get<any[]>(`${this.apiUrl}/assignations/soignants/all`).subscribe({
            next: (list) => {
                const found = list.find((s: any) => s.id === id) ?? list[0];
                if (found) this.setSoignant(found);
                else this.setFallback();
            },
            error: () => this.setFallback()
        });
    }

    private loadAidant(id: number) {
        this.http.get<any[]>(`${this.apiUrl}/aidant/all`).subscribe({
            next: (list) => {
                const found = list.find((a: any) => a.id === id) ?? list[0];
                if (found) this.setAidant(found);
                else this.setFallback();
            },
            error: () => this.setFallback()
        });
    }

    private loadPatient(id: number) {
        this.http.get<any[]>(`${this.apiUrl}/assignations/patients/all`).subscribe({
            next: (list) => {
                const found = list.find((p: any) => p.id === id) ?? list[0];
                if (found) this.setPatient(found);
                else this.setFallback();
            },
            error: () => this.setFallback()
        });
    }

    // ── Setters ────────────────────────────────────────────────────────────────

    private setSoignant(s: any) {
        this.currentUser.set({
            id: s.id,
            nom: s.nom ?? '',
            prenom: s.prenom ?? '',
            displayName: `Dr. ${s.prenom ?? ''} ${s.nom ?? ''}`.trim(),
            role: 'SOIGNANT',
            roleLabel: s.specialite ?? 'Médecin',
            initials: this.buildInitials(s.prenom, s.nom),
            specialite: s.specialite
        });
        this.loaded.set(true);
    }

    private setAidant(a: any) {
        this.currentUser.set({
            id: a.id,
            nom: a.nom ?? '',
            prenom: a.prenom ?? '',
            displayName: `${a.prenom ?? ''} ${a.nom ?? ''}`.trim(),
            role: 'AIDANT',
            roleLabel: a.relation ? `Aidant — ${a.relation}` : 'Aidant familial',
            initials: this.buildInitials(a.prenom, a.nom),
            relation: a.relation
        });
        this.loaded.set(true);
    }

    private setPatient(p: any) {
        this.currentUser.set({
            id: p.id,
            nom: p.nom ?? '',
            prenom: p.prenom ?? '',
            displayName: `${p.prenom ?? ''} ${p.nom ?? ''}`.trim(),
            role: 'PATIENT',
            roleLabel: 'Patient',
            initials: this.buildInitials(p.prenom, p.nom)
        });
        this.loaded.set(true);
    }

    private setFallback() {
        this.currentUser.set({
            id: 1,
            nom: 'Martin',
            prenom: 'Pierre',
            displayName: 'Dr. Pierre Martin',
            role: 'SOIGNANT',
            roleLabel: 'Médecin',
            initials: 'PM'
        });
        this.loaded.set(true);
    }

    private buildInitials(prenom: string, nom: string): string {
        return ((prenom?.[0] ?? '') + (nom?.[0] ?? '')).toUpperCase();
    }
}
