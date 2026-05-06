import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Recommendation, PriorityLevel, RecommendStatus } from '../models/cognitive-models';

/**
 * Interface pour la création d'une recommandation (DTO depuis le formulaire)
 */
export interface CreateRecommendationDto {
    patientId: number;
    action: string;
    priority: PriorityLevel;
    deadline: string;
    notes?: string;
}

/**
 * Interface pour un patient dans le contexte de sélection
 */
export interface PatientOption {
    id: number;
    nom: string;
    prenom: string;
    dateNaissance: string;
    age: number;
    displayName: string; // "Prénom Nom - Date de naissance (xx ans)"
}

@Injectable({
    providedIn: 'root'
})
export class RecommendationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/recommendations`;

    // BehaviorSubject pour notifier les changements
    private recommendationsSubject = new BehaviorSubject<Recommendation[]>([]);
    public recommendations$ = this.recommendationsSubject.asObservable();

    /**
     * Récupère toutes les recommandations d'un médecin
     */
    getByClinicianId(clinicianId: number): Observable<Recommendation[]> {
        return this.http.get<Recommendation[]>(`${this.apiUrl}/clinician/${clinicianId}`);
    }

    /**
     * Récupère toutes les recommandations d'un patient
     */
    getByPatientId(patientId: number): Observable<Recommendation[]> {
        return this.http.get<Recommendation[]>(`${this.apiUrl}/patient/${patientId}`);
    }

    /**
     * Récupère les recommandations par statut
     */
    getByStatus(status: RecommendStatus): Observable<Recommendation[]> {
        return this.http.get<Recommendation[]>(`${this.apiUrl}/status/${status}`);
    }

    /**
     * Récupère une recommandation spécifique
     */
    getById(id: number): Observable<Recommendation> {
        return this.http.get<Recommendation>(`${this.apiUrl}/${id}`);
    }

    /**
     * Crée une nouvelle recommandation
     */
    create(dto: CreateRecommendationDto, clinicianId: number): Observable<Recommendation> {
        // deadline : on strip le 'Z' et les ms → "yyyy-MM-ddTHH:mm:ss"
        // pour que Jackson désérialise correctement en LocalDateTime (pas de timezone)
        const deadlineForBackend = dto.deadline
            ? new Date(dto.deadline).toISOString().slice(0, 19)
            : undefined;

        const payload = {
            action:     dto.action,
            priority:   dto.priority,
            notes:      dto.notes,
            patientId:  dto.patientId,
            clinicianId,
            deadline:   deadlineForBackend,
            status:     RecommendStatus.PENDING,
            targetRole: 'CAREGIVER'
            // createdAt non envoyé : géré par @PrePersist côté backend
        };
        return this.http.post<Recommendation>(this.apiUrl, payload);
    }

    /**
     * Met à jour le statut d'une recommandation
     */
    updateStatus(id: number, status: RecommendStatus, completedBy?: number): Observable<Recommendation> {
        const params = new HttpParams().set('status', status);
        const body = completedBy ? { completedBy } : {};
        return this.http.patch<Recommendation>(`${this.apiUrl}/${id}/status`, body, { params });
    }

    /**
     * Modifie une recommandation existante (avant que l'aidant ne l'ait commencée)
     */
    update(id: number, partial: Partial<Recommendation>): Observable<Recommendation> {
        return this.http.put<Recommendation>(`${this.apiUrl}/${id}`, partial);
    }

    /**
     * Supprime une recommandation
     */
    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    /**
     * Récupère les patients assignés à un médecin (pour le formulaire)
     */
    getPatientsForClinician(clinicianId: number): Observable<PatientOption[]> {
        return this.http.get<PatientOption[]>(`${this.apiUrl}/clinician/${clinicianId}/patients`);
    }

    /**
     * Met à jour le cache local des recommandations
     */
    updateLocalCache(recommendations: Recommendation[]): void {
        this.recommendationsSubject.next(recommendations);
    }

    /**
     * Ajoute une nouvelle recommandation au cache local
     */
    addToCache(recommendation: Recommendation): void {
        const current = this.recommendationsSubject.value;
        this.recommendationsSubject.next([recommendation, ...current]);
    }

    /**
     * Calcule l'âge à partir de la date de naissance
     */
    calculateAge(dateNaissance: string): number {
        const birthDate = new Date(dateNaissance);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1;
        }
        return age;
    }

    /**
     * Formate la date de naissance pour affichage (JJ/MM/AAAA)
     */
    formatBirthDate(dateNaissance: string): string {
        try {
            const date = new Date(dateNaissance);
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return dateNaissance;
        }
    }

    /**
     * Crée le texte d'affichage pour un patient
     * Format: "Prénom Nom - Date de naissance (xx ans)"
     */
    formatPatientDisplay(patient: any): string {
        const age = this.calculateAge(patient.dateNaissance);
        const birthDate = this.formatBirthDate(patient.dateNaissance);
        return `${patient.prenom} ${patient.nom} - ${birthDate} (${age} ans)`;
    }

    /**
     * Génère la date de deadline proposée en fonction de la priorité.
     * Retourne une chaîne "yyyy-MM-ddThh:mm" compatible avec <input type="datetime-local">.
     * URGENT: +2h, HIGH: +24h, MEDIUM: +48h, LOW: +5j
     */
    generateDeadlineByPriority(priority: PriorityLevel): string {
        const now = new Date();

        switch (priority) {
            case PriorityLevel.URGENT: now.setHours(now.getHours() + 2);   break;
            case PriorityLevel.HIGH:   now.setHours(now.getHours() + 24);  break;
            case PriorityLevel.MEDIUM: now.setHours(now.getHours() + 48);  break;
            case PriorityLevel.LOW:    now.setDate(now.getDate() + 5);     break;
        }

        // Format "yyyy-MM-ddThh:mm" requis par datetime-local
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    /**
     * Formate une date pour affichage (JJ/MM/AAAA HH:MM)
     */
    formatDeadline(dateTime: string | Date): string {
        try {
            const date = new Date(dateTime);
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }) + ' ' + date.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return String(dateTime);
        }
    }

    /**
     * Calcule le texte "Dans X heure(s)", "Dans X jour(s)", etc.
     */
    getTimeStrings(deadline: string): any {
        const now = new Date();
        const deadlineDate = new Date(deadline);
        const diffMs = deadlineDate.getTime() - now.getTime();

        if (diffMs < 0) {
            return {
                text: 'Expiré',
                isExpired: true,
                color: 'red'
            };
        }

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);

        if (diffHours < 1) {
            return {
                text: 'Dans moins d\'une heure',
                isExpired: false,
                color: 'orange'
            };
        }

        if (diffHours < 24) {
            return {
                text: `Dans ${diffHours} heure${diffHours > 1 ? 's' : ''}`,
                isExpired: false,
                color: 'orange'
            };
        }

        if (diffDays < 7) {
            return {
                text: `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`,
                isExpired: false,
                color: 'yellow'
            };
        }

        if (diffWeeks === 1) {
            return {
                text: 'Dans 1 semaine',
                isExpired: false,
                color: 'green'
            };
        }

        return {
            text: `Dans ${diffWeeks} semaines`,
            isExpired: false,
            color: 'green'
        };
    }
}
