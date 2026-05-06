import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, ChevronLeft, Plus, Trash2, Save, Image as ImageIcon, Music, Type, User, Sparkles } from 'lucide-angular';
import { AssignationService } from '../../services/assignation.service';
import { GeminiService } from '../../services/gemini.service';
import { PersonalizedTestRequest, PersonalizedTestItem, AccompagnantDTO } from '../../models/cognitive-models';

export interface ValidationNotification {
    type: 'error' | 'warning' | 'success';
    title: string;
    messages: string[];
}

@Component({
    selector: 'app-personalized-test-form',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './personalized-test-form.component.html',
    styleUrls: ['./personalized-test-form.component.css']
})
export class PersonalizedTestFormComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private assignationService = inject(AssignationService);
    private geminiService = inject(GeminiService);

    testType = signal<string>('');
    patientId = signal<number>(0);
    patientName = signal<string>('');
    stage = signal<'STABLE' | 'MOYEN' | 'CRITIQUE'>('STABLE');
    testTitle = signal<string>('');

    // Common Fields
    dateLimite = signal<string>('');
    instructions = signal<string>('');
    selectedAidantId = signal<number | null>(null);

    // Items
    items = signal<PersonalizedTestItem[]>([]);

    // Aidants List
    aidants = signal<AccompagnantDTO[]>([]);

    // Patient and soignant data
    patientData = signal<any>(null);
    soignantData = signal<any>(null);

    // Validation state
    notification = signal<ValidationNotification | null>(null);
    submitting = signal<boolean>(false);
    generatingAI = signal<boolean>(false);
    invalidFields = signal<Set<string>>(new Set());

    readonly icons = { ChevronLeft, Plus, Trash2, Save, ImageIcon, Music, Type, User, Sparkles };

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.testType.set(params['type'] || 'FACES');
            this.patientId.set(Number(params['patientId']) || 0);
            this.patientName.set(params['patientName'] || 'Patient');
            this.stage.set(params['stage'] || 'STABLE');

            this.initializeForm();
            this.loadAidants();
            this.loadPatientData();
        });
    }

    loadPatientData() {
        const patientId = this.patientId();
        if (patientId && patientId > 0) {
            this.assignationService.getAllPatientsWithMedecin().subscribe((patients: any[]) => {
                const patient = patients.find(p => p.id === patientId);
                if (patient) {
                    this.patientData.set(patient);
                    this.patientName.set(`${patient.prenom} ${patient.nom}`);
                    this.soignantData.set(patient.medecin);
                } else {
                    console.error('Patient non trouvé avec ID:', patientId);
                }
            });
        }
    }

    initializeForm() {
        const type = this.testType();
        let title = '';

        switch (type) {
            case 'FACES': title = 'Mémoire des visages personnalisée'; break;
            case 'CROSSWORDS': title = 'Mots croisés personnalisés'; break;
            case 'MEMORY': title = 'Memory personnalisé'; break;
            case 'SCENTS': title = 'Reconnaissance d\'odeurs personnalisée'; break;
            case 'RELATIVES': title = 'Reconnaissance des proches personnalisée'; break;
            case 'SONGS': title = 'Chansons personnalisées'; break;
            default: title = 'Test Personnalisé';
        }
        this.testTitle.set(title);
        this.addItem();
    }

    loadAidants() {
        this.assignationService.getAllAidants().subscribe((aidants: AccompagnantDTO[]) => {
            this.aidants.set(aidants);
        });
    }

    addItem() {
        const newItem: PersonalizedTestItem = {
            question: '',
            reponse: '',
            score: 1,
            metadata: {}
        };

        if (this.testType() === 'FACES') newItem.question = 'Qui est cette personne ?';
        if (this.testType() === 'RELATIVES') newItem.question = 'Qui est sur cette photo ?';
        if (this.testType() === 'SCENTS') newItem.question = 'Quelle odeur est-ce ?';
        if (this.testType() === 'MEMORY') newItem.question = 'Trouvez la paire identique';
        if (this.testType() === 'SONGS') newItem.question = 'Reconnaissez-vous cette chanson ?';

        this.items.update(items => [...items, newItem]);
        this.clearNotification();
    }

    removeItem(index: number) {
        this.items.update(items => items.filter((_, i) => i !== index));
    }

    onFileSelected(event: any, index: number) {
        const file = event.target.files[0];
        if (file) {
            const fakeUrl = `assets/uploads/${file.name}`;
            this.items.update(items => {
                const updated = [...items];
                updated[index].imageUrl = fakeUrl;
                return updated;
            });
        }
    }

    clearNotification() {
        this.notification.set(null);
        this.invalidFields.set(new Set());
    }

    isFieldInvalid(field: string): boolean {
        return this.invalidFields().has(field);
    }

    private validateLocally(): string[] {
        const errors: string[] = [];
        const invalid = new Set<string>();

        if (!this.dateLimite() || this.dateLimite().trim() === '') {
            errors.push('La date limite est obligatoire');
            invalid.add('dateLimite');
        }

        if (this.items().length === 0) {
            errors.push('Le test doit contenir au moins un élément');
        }

        for (let i = 0; i < this.items().length; i++) {
            const item = this.items()[i];

            if (!item.question || item.question.trim() === '') {
                errors.push(`Élément ${i + 1} : La question est obligatoire`);
                invalid.add(`item_${i}_question`);
            }

            if (!item.reponse || item.reponse.trim() === '') {
                errors.push(`Élément ${i + 1} : La réponse est obligatoire`);
                invalid.add(`item_${i}_reponse`);
            }

            if (this.testType() === 'FACES' || this.testType() === 'RELATIVES') {
                if (!item.metadata['nom'] || item.metadata['nom'].trim() === '') {
                    errors.push(`Élément ${i + 1} : Le nom de la personne est obligatoire`);
                    invalid.add(`item_${i}_nom`);
                }
                if (!item.metadata['lien'] || item.metadata['lien'].trim() === '') {
                    errors.push(`Élément ${i + 1} : Le lien avec le patient est obligatoire`);
                    invalid.add(`item_${i}_lien`);
                }
            }

            if (this.testType() === 'SCENTS') {
                if (!item.metadata['description'] || item.metadata['description'].trim() === '') {
                    errors.push(`Élément ${i + 1} : La description de l'odeur est obligatoire`);
                    invalid.add(`item_${i}_description`);
                }
            }

            if (this.testType() === 'SONGS') {
                if (!item.metadata['titre'] || item.metadata['titre'].trim() === '') {
                    errors.push(`Élément ${i + 1} : Le titre de la chanson est obligatoire`);
                    invalid.add(`item_${i}_titre`);
                }
                if (!item.metadata['artiste'] || item.metadata['artiste'].trim() === '') {
                    errors.push(`Élément ${i + 1} : L'artiste est obligatoire`);
                    invalid.add(`item_${i}_artiste`);
                }
            }
        }

        this.invalidFields.set(invalid);
        return errors;
    }

    submitForm() {
        this.clearNotification();
        const localErrors = this.validateLocally();

        if (localErrors.length > 0) {
            this.notification.set({
                type: 'error',
                title: 'Veuillez corriger les erreurs suivantes :',
                messages: localErrors
            });
            // Scroll to top of form
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        this.submitting.set(true);

        const request: PersonalizedTestRequest = {
            patientId: this.patientId(),
            soignantId: undefined,
            accompagnantId: this.selectedAidantId() || undefined,
            titre: `${this.testTitle()} - ${this.patientName()}`,
            description: `Test personnalisé de type ${this.testType()}`,
            stage: this.stage(),
            dateLimite: this.dateLimite(),
            instructions: this.instructions(),
            items: this.items()
        };

        this.assignationService.createPersonalizedAssignation(request).subscribe({
            next: () => {
                this.submitting.set(false);
                this.notification.set({
                    type: 'success',
                    title: 'Test créé avec succès',
                    messages: [
                        'Le test personnalisé a été créé et assigné.',
                        'Médecin assigné automatiquement : ' +
                        (this.soignantData()
                            ? `${this.soignantData().prenom} ${this.soignantData().nom}`
                            : 'Non spécifié')
                    ]
                });
                setTimeout(() => this.router.navigate(['/tests-cognitifs']), 1800);
            },
            error: (err: any) => {
                this.submitting.set(false);
                const body = err.error;

                // Backend validation errors (HTTP 400 with validationErrors map)
                if (body?.validationErrors && Object.keys(body.validationErrors).length > 0) {
                    const messages = Object.entries(body.validationErrors)
                        .map(([field, msg]) => `${this.formatFieldName(field)} : ${msg}`);
                    this.notification.set({
                        type: 'error',
                        title: body.message || 'Erreur de validation',
                        messages
                    });
                } else {
                    const type = body?.severity === 'WARNING' ? 'warning' : 'error';
                    this.notification.set({
                        type,
                        title: body?.error || 'Erreur',
                        messages: [body?.message || err.message || 'Une erreur inattendue est survenue.']
                    });
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    private formatFieldName(field: string): string {
        const labels: Record<string, string> = {
            patientId: 'Patient',
            titre: 'Titre',
            dateLimitString: 'Date limite',
            items: 'Éléments',
            'items[0].question': 'Élément 1 - Question',
            'items[0].reponse': 'Élément 1 - Réponse',
        };
        return labels[field] ?? field;
    }

    generateWithAI() {
        this.generatingAI.set(true);
        this.clearNotification();
        this.geminiService.generateTestItems(
            this.testType(),
            this.stage(),
            this.patientName(),
            3
        ).subscribe({
            next: (items) => {
                this.generatingAI.set(false);
                if (items.length === 0) {
                    this.notification.set({
                        type: 'warning',
                        title: 'Génération IA',
                        messages: ['Aucun élément généré. Vérifiez votre clé API Gemini dans environment.ts']
                    });
                    return;
                }
                this.items.set(items);
                this.notification.set({
                    type: 'success',
                    title: 'Génération IA réussie',
                    messages: [`${items.length} question(s) générée(s) par Gemini AI pour le stade ${this.stage()}.`]
                });
            },
            error: (err: any) => {
                this.generatingAI.set(false);
                const is429 = err?.status === 429;
                this.notification.set({
                    type: is429 ? 'warning' : 'error',
                    title: is429 ? 'Limite de requêtes atteinte' : 'Erreur Gemini AI',
                    messages: [is429
                        ? 'Trop de requêtes envoyées. Attendez ~1 minute et réessayez (limite gratuite : 15 req/min).'
                        : 'Impossible de contacter l\'API Gemini. Vérifiez votre clé API dans environment.ts']
                });
            }
        });
    }

    cancel() {
        this.router.navigate(['/tests-cognitifs']);
    }
}
