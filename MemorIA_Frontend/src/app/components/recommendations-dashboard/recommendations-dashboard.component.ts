import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';

import { RecommendationService, PatientOption } from '../../services/recommendation.service';
import { Recommendation, PriorityLevel, RecommendStatus } from '../../models/cognitive-models';
import { CurrentUserService } from '../../services/current-user.service';
import { NewRecommendationModalComponent } from '../new-recommendation-modal/new-recommendation-modal.component';

@Component({
    selector: 'app-recommendations-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatTooltipModule,
        MatChipsModule,
        MatProgressBarModule,
        MatDialogModule,
        MatTabsModule
    ],
    templateUrl: './recommendations-dashboard.component.html',
    styleUrls: ['./recommendations-dashboard.component.css']
})
export class RecommendationsDashboardComponent implements OnInit {
    private recommendationService = inject(RecommendationService);
    private currentUserService = inject(CurrentUserService);
    public dialog = inject(MatDialog);

    recommendations: Recommendation[] = [];
    filteredRecommendations: Recommendation[] = [];
    loading = false;
    clinicianId: number | null = null;
    clinicianName: string = '';
    selectedStatus: RecommendStatus | 'ALL' = 'ALL';

    // Enums
    PriorityLevel = PriorityLevel;
    RecommendStatus = RecommendStatus;

    // Tabs
    statusTabs = [
        { value: 'ALL', label: 'Toutes', count: 0 },
        { value: RecommendStatus.PENDING, label: 'En attente', count: 0 },
        { value: RecommendStatus.IN_PROGRESS, label: 'En cours', count: 0 },
        { value: RecommendStatus.COMPLETED, label: 'Complétées', count: 0 },
        { value: RecommendStatus.DISMISSED, label: 'Ignorées', count: 0 }
    ];

    ngOnInit(): void {
        this.getCurrentUser();
        this.loadRecommendations();

        // S'abonner aux changements de recommandations
        this.recommendationService.recommendations$.subscribe(recommendations => {
            this.recommendations = recommendations;
            this.filterRecommendations();
        });
    }

    /**
     * Récupère l'utilisateur courant (médecin)
     */
    private getCurrentUser(): void {
        const user = this.currentUserService.getCurrentUser();
        if (user) {
            this.clinicianId = user.id;
            this.clinicianName = `${user.prenom} ${user.nom}`;
        }
    }

    /**
     * Charge les recommandations du médecin
     */
    private loadRecommendations(): void {
        if (!this.clinicianId) return;

        this.loading = true;
        this.recommendationService.getByClinicianId(this.clinicianId).subscribe({
            next: (recommendations) => {
                // Marquer les recommandations ajoutées dans les 24 dernières heures comme "new"
                const now = new Date();
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

                this.recommendations = recommendations.map(rec => ({
                    ...rec,
                    isNew: rec.createdAt ? new Date(rec.createdAt) > oneDayAgo : false
                }));

                this.filterRecommendations();
                this.loading = false;
            },
            error: (error) => {
                console.error('Erreur lors du chargement:', error);
                this.loading = false;
            }
        });
    }

    /**
     * Filtre les recommandations selon le statut sélectionné
     */
    private filterRecommendations(): void {
        if (this.selectedStatus === 'ALL') {
            this.filteredRecommendations = this.recommendations;
        } else {
            this.filteredRecommendations = this.recommendations.filter(
                rec => rec.status === this.selectedStatus
            );
        }

        // Mettre à jour les compteurs des tabs
        this.updateTabCounts();
    }

    /**
     * Met à jour les compteurs pour chaque statut
     */
    private updateTabCounts(): void {
        this.statusTabs.forEach(tab => {
            if (tab.value === 'ALL') {
                tab.count = this.recommendations.length;
            } else {
                tab.count = this.recommendations.filter(
                    rec => rec.status === tab.value
                ).length;
            }
        });
    }

    /**
     * Change le filtre de statut
     */
    onStatusTabChange(status: RecommendStatus | 'ALL'): void {
        this.selectedStatus = status;
        this.filterRecommendations();
    }

    /**
     * Ouvre la modale de création de recommandation
     */
    openNewRecommendationDialog(): void {
        if (!this.clinicianId) return;

        const dialogRef = this.dialog.open(NewRecommendationModalComponent, {
            width: '600px',
            maxWidth: '95vw',
            data: {
                clinicianId: this.clinicianId,
                clinicianName: this.clinicianName
            },
            panelClass: 'recommendation-dialog'
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Recharger les recommandations
                this.loadRecommendations();
            }
        });
    }

    /**
     * Retourne la couleur pour une priorité
     */
    getPriorityColor(priority: PriorityLevel): string {
        switch (priority) {
            case PriorityLevel.LOW: return '#4caf50';
            case PriorityLevel.MEDIUM: return '#ffc107';
            case PriorityLevel.HIGH: return '#ff9800';
            case PriorityLevel.URGENT: return '#f44336';
            default: return '#999';
        }
    }

    /**
     * Retourne l'emoji pour une priorité
     */
    getPriorityEmoji(priority: PriorityLevel): string {
        switch (priority) {
            case PriorityLevel.LOW: return '🟢';
            case PriorityLevel.MEDIUM: return '🟡';
            case PriorityLevel.HIGH: return '🟠';
            case PriorityLevel.URGENT: return '🔴';
            default: return '⚪';
        }
    }

    /**
     * Retourne le label pour une priorité
     */
    getPriorityLabel(priority: PriorityLevel): string {
        switch (priority) {
            case PriorityLevel.LOW: return 'Basse';
            case PriorityLevel.MEDIUM: return 'Moyenne';
            case PriorityLevel.HIGH: return 'Haute';
            case PriorityLevel.URGENT: return 'Urgente';
            default: return 'Inconnue';
        }
    }

    /**
     * Retourne le label pour un statut
     */
    getStatusLabel(status: RecommendStatus): string {
        switch (status) {
            case RecommendStatus.PENDING: return 'En attente';
            case RecommendStatus.IN_PROGRESS: return 'En cours';
            case RecommendStatus.COMPLETED: return 'Complétée';
            case RecommendStatus.DISMISSED: return 'Ignorée';
            default: return 'Inconnu';
        }
    }

    /**
     * Retourne la couleur pour un statut
     */
    getStatusColor(status: RecommendStatus): string {
        switch (status) {
            case RecommendStatus.PENDING: return '#2196f3';
            case RecommendStatus.IN_PROGRESS: return '#ff9800';
            case RecommendStatus.COMPLETED: return '#4caf50';
            case RecommendStatus.DISMISSED: return '#999';
            default: return '#666';
        }
    }

    /**
     * Obtient l'indication de délai (Dans X heures, etc.)
     */
    getTimeString(deadline: string | undefined): string {
        if (!deadline) return '';
        const timeInfo = this.recommendationService.getTimeStrings(deadline);
        return timeInfo.text;
    }

    /**
     * Formate la deadline pour affichage
     */
    formatDeadline(deadline: string | undefined): string {
        if (!deadline) return '';
        return this.recommendationService.formatDeadline(deadline);
    }

    /**
     * Supprime une recommandation (avec confirmation)
     */
    deleteRecommendation(id: number | undefined): void {
        if (!id) return;

        if (confirm('Êtes-vous sûr de vouloir supprimer cette recommandation ?')) {
            this.recommendationService.delete(id).subscribe({
                next: () => {
                    this.recommendations = this.recommendations.filter(r => r.id !== id);
                    this.filterRecommendations();
                },
                error: (error) => {
                    console.error('Erreur lors de la suppression:', error);
                }
            });
        }
    }

    /**
     * Modifie une recommandation (si statut = PENDING)
     */
    editRecommendation(recommendation: Recommendation): void {
        if (recommendation.status !== RecommendStatus.PENDING) {
            alert('Impossible de modifier une recommandation en cours ou complétée');
            return;
        }

        // TODO: Ouvrir un formulaire de modification
        console.log('Éditer:', recommendation);
    }

    /**
     * Ouvre les détails d'une recommandation
     */
    viewDetails(recommendation: Recommendation): void {
        // TODO: Ouvrir un panel/dialog de détails
        console.log('Voir détails:', recommendation);
    }

    /**
     * Compte le nombre de recommandations urgentes
     */
    getUrgentCount(): number {
        return this.recommendations.filter(
            rec => rec.priority === PriorityLevel.URGENT
        ).length;
    }

    /**
     * Compte le nombre de recommandations complétées
     */
    getCompletedCount(): number {
        return this.recommendations.filter(
            rec => rec.status === RecommendStatus.COMPLETED
        ).length;
    }
}
