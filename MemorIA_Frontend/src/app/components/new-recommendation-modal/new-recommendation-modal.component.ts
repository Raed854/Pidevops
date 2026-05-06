import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';

import { RecommendationService, PatientOption, CreateRecommendationDto } from '../../services/recommendation.service';
import { PriorityLevel, RecommendStatus } from '../../models/cognitive-models';
import { NotificationService } from '../../services/notification.service';

export interface DialogData {
    clinicianId: number;
    clinicianName: string;
}

@Component({
    selector: 'app-new-recommendation-modal',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule
    ],
    templateUrl: './new-recommendation-modal.component.html',
    styleUrls: ['./new-recommendation-modal.component.css']
})
export class NewRecommendationModalComponent implements OnInit {
    private fb = inject(FormBuilder);
    public recommendationService = inject(RecommendationService);
    public dialogRef = inject(MatDialogRef<NewRecommendationModalComponent>);
    private notificationService = inject(NotificationService);
    public data: DialogData = inject(MAT_DIALOG_DATA);

    form: FormGroup;
    patients: PatientOption[] = [];
    loadingPatients = false;
    submitLoading = false;
    
    // Énumérations
    priorityOptions = [
        { value: PriorityLevel.LOW, label: 'Basse', color: 'green', emoji: '🟢', description: 'Action sans urgence, à faire dans la semaine' },
        { value: PriorityLevel.MEDIUM, label: 'Moyenne', color: 'yellow', emoji: '🟡', description: 'À faire sous 2-3 jours' },
        { value: PriorityLevel.HIGH, label: 'Haute', color: 'orange', emoji: '🟠', description: 'À faire rapidement (24-48h)' },
        { value: PriorityLevel.URGENT, label: 'Urgente', color: 'red', emoji: '🔴', description: 'À réaliser immédiatement (prochaines heures)' }
    ];

    characterCount = 0;
    actionHelpVisible = false;
    actionHelpTimer: any;
    minDeadline: string = '';
    selectedPatient: PatientOption | null = null;

    constructor() {
        this.form = this.fb.group({
            patientId: [null, Validators.required],
            action: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
            priority: [PriorityLevel.MEDIUM, Validators.required],
            deadline: [null, Validators.required],
            notes: ['']
        });
    }

    ngOnInit(): void {
        this.loadPatients();
        this.updateMinDeadline();
        
        // Afficher l'aide après 5 secondes d'inactivité dans le champ action
        this.form.get('action')?.valueChanges.subscribe(value => {
            this.characterCount = value ? value.length : 0;
            
            // Réinitialiser le timer
            if (this.actionHelpTimer) {
                clearTimeout(this.actionHelpTimer);
            }
            
            // Montrer l'aide si le champ est vide depuis 5 secondes
            if (!value || value.length === 0) {
                this.actionHelpTimer = setTimeout(() => {
                    if (!value || value.length === 0) {
                        this.actionHelpVisible = true;
                    }
                }, 5000);
            }
        });

        // Mettre à jour la deadline proposée quand la priorité change
        this.form.get('priority')?.valueChanges.subscribe(priority => {
            if (!this.form.get('deadline')?.dirty) {
                const proposedDeadline = this.recommendationService.generateDeadlineByPriority(priority);
                this.form.get('deadline')?.setValue(proposedDeadline);
            }
        });

        // Définir la deadline initiale selon la priorité par défaut
        const initialDeadline = this.recommendationService.generateDeadlineByPriority(PriorityLevel.MEDIUM);
        this.form.get('deadline')?.setValue(initialDeadline);
    }

    ngOnDestroy(): void {
        if (this.actionHelpTimer) {
            clearTimeout(this.actionHelpTimer);
        }
    }

    /**
     * Charge la liste des patients du médecin
     */
    private loadPatients(): void {
        this.loadingPatients = true;
        this.recommendationService.getPatientsForClinician(this.data.clinicianId).subscribe({
            next: (patients) => {
                this.patients = patients;
                this.loadingPatients = false;

                // Si un seul patient, le présélectionner
                if (patients.length === 1) {
                    this.form.get('patientId')?.setValue(patients[0].id);
                    this.form.get('patientId')?.disable();
                    this.selectedPatient = patients[0];
                }

                // Si aucun patient
                if (patients.length === 0) {
                    this.form.get('patientId')?.disable();
                }
            },
            error: (error) => {
                console.error('Erreur lors du chargement des patients:', error);
                this.loadingPatients = false;
                this.notificationService.showError('Impossible de charger les patients');
            }
        });
    }

    /**
     * Gère la sélection d'un patient
     */
    onPatientSelected(patientId: number): void {
        const patient = this.patients.find(p => p.id === patientId);
        this.selectedPatient = patient || null;
    }

    /**
     * Donne la couleur pour une priorité
     */
    getPriorityColor(priority: PriorityLevel): string {
        const option = this.priorityOptions.find(o => o.value === priority);
        return option?.color || 'gray';
    }

    /**
     * Donne l'emoji pour une priorité
     */
    getPriorityEmoji(priority: PriorityLevel): string {
        const option = this.priorityOptions.find(o => o.value === priority);
        return option?.emoji || '⚪';
    }

    /**
     * Donne la couleur de fond (CSS) pour un point de priorité
     */
    getPriorityBg(priority: PriorityLevel): string {
        switch (priority) {
            case PriorityLevel.LOW:    return '#00635D';
            case PriorityLevel.MEDIUM: return '#E6A800';
            case PriorityLevel.HIGH:   return '#e65100';
            case PriorityLevel.URGENT: return '#CB1527';
            default:                   return '#7E7F9A';
        }
    }

    /**
     * Valide que le texte ne contient pas de contenu malveillant
     */
    private sanitizeAction(text: string): string {
        // Supprimer les balises HTML
        let cleaned = text.replace(/<[^>]*>/g, '');
        
        // Supprimer les scripts
        cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gi, '');
        
        // Supprimer les caractères de contrôle ASCII
        cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
        
        return cleaned.trim();
    }

    /**
     * Valide le formulaire avant d'envoyer
     */
    private validateForm(): boolean {
        if (!this.form.valid) {
            // Marquer tous les champs comme touchés pour afficher les erreurs
            Object.keys(this.form.controls).forEach(key => {
                this.form.get(key)?.markAsTouched();
            });
            return false;
        }

        // Vérifier que aucun champ n'est désactivé (sauf si c'est une raison valide)
        const patientId = this.form.get('patientId')?.value;
        if (!patientId && this.patients.length > 0) {
            this.notificationService.showError('Veuillez sélectionner un patient');
            return false;
        }

        return true;
    }

    /**
     * Soumet le formulaire
     */
    onSubmit(): void {
        if (!this.validateForm()) {
            return;
        }

        this.submitLoading = true;
        const formValue = this.form.value;

        // Nettoyer l'action
        const cleanedAction = this.sanitizeAction(formValue.action);

        // Construire le DTO
        const dto: CreateRecommendationDto = {
            patientId: formValue.patientId,
            action: cleanedAction,
            priority: formValue.priority,
            deadline: this.formatDateTimeForBackend(formValue.deadline),
            notes: formValue.notes ? formValue.notes.trim() : undefined
        };

        this.recommendationService.create(dto, this.data.clinicianId).subscribe({
            next: (recommendation) => {
                this.submitLoading = false;
                
                // Ajouter au cache local
                this.recommendationService.addToCache(recommendation);
                
                // Afficher un message de succès
                this.notificationService.showSuccess('Recommandation ajoutée avec succès ✓');
                
                // Fermer la modale après 1 seconde
                setTimeout(() => {
                    this.dialogRef.close(recommendation);
                }, 1000);
            },
            error: (error) => {
                this.submitLoading = false;
                const serverMsg = error.error?.message || error.error?.error || JSON.stringify(error.error);
                console.error('[Recommandation] Erreur création:', error.status, serverMsg);

                if (error.status === 401) {
                    this.notificationService.showError('Votre session a expiré');
                } else if (error.status === 404) {
                    this.notificationService.showError('Patient introuvable');
                } else if (error.status === 400) {
                    this.notificationService.showError('Données invalides: ' + serverMsg);
                } else {
                    this.notificationService.showError('Erreur serveur: ' + serverMsg);
                }
            }
        });
    }

    /**
     * Annule l'édition
     */
    onCancel(): void {
        if (this.form.dirty) {
            if (confirm('Voulez-vous abandonner la création ? Les données non sauvegardées seront perdues.')) {
                this.dialogRef.close();
            }
        } else {
            this.dialogRef.close();
        }
    }

    /**
     * Met à jour la date minimale acceptable pour la deadline
     */
    private updateMinDeadline(): void {
        const now = new Date();
        now.setHours(now.getHours() + 1); // Minimum 1 heure
        this.minDeadline = now.toISOString().slice(0, 16);
    }

    /**
     * Formate une date JavaScript pour envoi au backend (ISO 8601)
     */
    private formatDateTimeForBackend(date: Date | string): string {
        if (!date) return '';
        
        const d = new Date(date);
        return d.toISOString();
    }

    /**
     * Obtient le message d'erreur pour le champ action
     */
    getActionErrorMessage(): string {
        const control = this.form.get('action');
        if (control?.hasError('required')) {
            return 'L\'action est obligatoire';
        }
        if (control?.hasError('minlength')) {
            return `Minimum 10 caractères (${this.characterCount}/10)`;
        }
        if (control?.hasError('maxlength')) {
            return `Maximum 500 caractères atteint (${this.characterCount}/500)`;
        }
        return '';
    }

    /**
     * Obtient la couleur du compteur de caractères
     */
    getCharacterCountColor(): string {
        if (this.characterCount <= 400) return 'green';
        if (this.characterCount <= 490) return 'orange';
        return 'red';
    }

    /**
     * Vérifie si le bouton soumettre doit être désactivé
     */
    isSubmitDisabled(): boolean {
        return !this.form.valid || this.submitLoading;
    }
}
