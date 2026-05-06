import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface MMSEQuestion {
    id: number;
    section: string;
    questionText: string;
    type: 'mcq' | 'text' | 'yesno';
    maxScore: number;
    options?: string[];
}

@Component({
    selector: 'app-test-mmse',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './test-mmse.component.html',
    styleUrls: ['./test-mmse.component.css']
})
export class TestMmseComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    patientName = signal('Patient');
    patientId = signal<number>(0);
    assignationId = signal<number | null>(null);
    elapsedSeconds = signal(0);
    currentIndex = signal(0);
    answers = signal<{ [key: number]: string }>({});
    isComplete = signal(false);
    finalScore = signal(0);
    private timerInterval: any;

    sections = ['Orientation', 'Apprentissage', 'Attention', 'Rappel', 'Langage'];

    questions: MMSEQuestion[] = [
        // ORIENTATION (10 pts)
        { id: 1, section: 'Orientation', questionText: 'En quelle année sommes-nous ?', type: 'text', maxScore: 1 },
        { id: 2, section: 'Orientation', questionText: 'En quelle saison sommes-nous ?', type: 'mcq', maxScore: 1, options: ['Printemps', 'Été', 'Automne', 'Hiver'] },
        { id: 3, section: 'Orientation', questionText: 'En quel mois sommes-nous ?', type: 'text', maxScore: 1 },
        { id: 4, section: 'Orientation', questionText: 'Quel jour du mois sommes-nous ?', type: 'text', maxScore: 1 },
        { id: 5, section: 'Orientation', questionText: 'Quel jour de la semaine sommes-nous ?', type: 'mcq', maxScore: 1, options: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] },
        { id: 6, section: 'Orientation', questionText: 'Dans quel pays sommes-nous ?', type: 'mcq', maxScore: 1, options: ['France', 'Belgique', 'Suisse', 'Canada'] },
        { id: 7, section: 'Orientation', questionText: 'Dans quelle région sommes-nous ?', type: 'text', maxScore: 1 },
        { id: 8, section: 'Orientation', questionText: 'Dans quelle ville sommes-nous ?', type: 'text', maxScore: 1 },
        { id: 9, section: 'Orientation', questionText: 'Dans quel établissement sommes-nous ?', type: 'mcq', maxScore: 1, options: ['Hôpital', 'Cabinet médical', 'Clinique', 'Domicile'] },
        { id: 10, section: 'Orientation', questionText: 'À quel étage sommes-nous ?', type: 'mcq', maxScore: 1, options: ['Rez-de-chaussée', '1er étage', '2ème étage', '3ème étage'] },
        // APPRENTISSAGE (3 pts)
        { id: 11, section: 'Apprentissage', questionText: 'Répétez ces 3 mots : CITRON, CLÉ, BALLON', type: 'yesno', maxScore: 3 },
        { id: 12, section: 'Apprentissage', questionText: 'Avez-vous bien mémorisé les 3 mots ?', type: 'yesno', maxScore: 0 },
        // ATTENTION (5 pts)
        { id: 13, section: 'Attention', questionText: 'Épeler le mot MONDE à l\'envers (EDNOM)', type: 'text', maxScore: 5 },
        // RAPPEL (3 pts)
        { id: 14, section: 'Rappel', questionText: 'Quels étaient les 3 mots que vous deviez retenir ? (1er mot)', type: 'text', maxScore: 1 },
        { id: 15, section: 'Rappel', questionText: 'Quels étaient les 3 mots que vous deviez retenir ? (2ème mot)', type: 'text', maxScore: 1 },
        { id: 16, section: 'Rappel', questionText: 'Quels étaient les 3 mots que vous deviez retenir ? (3ème mot)', type: 'text', maxScore: 1 },
        // LANGAGE (9 pts)
        { id: 17, section: 'Langage', questionText: 'Comment s\'appelle cet objet ? (une montre)', type: 'text', maxScore: 1 },
        { id: 18, section: 'Langage', questionText: 'Comment s\'appelle cet objet ? (un crayon)', type: 'text', maxScore: 1 },
        { id: 19, section: 'Langage', questionText: 'Répétez : "Pas de si, ni de mais"', type: 'yesno', maxScore: 1 },
        { id: 20, section: 'Langage', questionText: 'Exécutez : Prenez ce papier de la main droite, pliez-le en deux, posez-le par terre', type: 'yesno', maxScore: 3 },
        { id: 21, section: 'Langage', questionText: 'Lire et obéir : "FERMEZ LES YEUX"', type: 'yesno', maxScore: 1 },
        { id: 22, section: 'Langage', questionText: 'Écrivez une phrase complète', type: 'text', maxScore: 1 },
        { id: 23, section: 'Langage', questionText: 'Copiez ce dessin (pentagones croisés)', type: 'yesno', maxScore: 1 },
    ];

    totalQuestions = computed(() => this.questions.length);
    currentQuestion = computed(() => this.questions[this.currentIndex()]);
    currentSection = computed(() => this.currentQuestion()?.section || '');
    isLastQuestion = computed(() => this.currentIndex() === this.questions.length - 1);
    progressPercentage = computed(() => Math.round((this.currentIndex() / this.totalQuestions()) * 100));
    currentScore = computed(() => {
        const ans = this.answers();
        let s = 0;
        this.questions.forEach(q => {
            if (ans[q.id] && ans[q.id].trim() !== '') s += q.maxScore;
        });
        return s;
    });

    formattedTime = computed(() => {
        const m = Math.floor(this.elapsedSeconds() / 60);
        const s = this.elapsedSeconds() % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    });

    sectionIndex = computed(() => {
        const sec = this.currentSection();
        return this.sections.indexOf(sec);
    });

    ngOnInit() {
        // Get patientId and assignationId from query params
        this.route.queryParams.subscribe(params => {
            if (params['patientId']) this.patientId.set(+params['patientId']);
            if (params['assignationId']) this.assignationId.set(+params['assignationId']);
            this.loadPatientInfo();
        });
        this.startTimer();
    }

    ngOnDestroy() {
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    private startTimer() {
        this.timerInterval = setInterval(() => this.elapsedSeconds.update(s => s + 1), 1000);
    }

    private loadPatientInfo() {
        const pid = this.patientId();
        if (pid) {
            this.http.get<any>(`${this.apiUrl}/assignations/patient/${pid}/tests`).subscribe({
                next: (assignments: any[]) => {
                    if (assignments && assignments.length > 0) {
                        const a = assignments[0];
                        const nom = a.patientNom || a.patient?.nom || '';
                        const prenom = a.patientPrenom || a.patient?.prenom || '';
                        this.patientName.set(`${prenom} ${nom}`.trim() || 'Patient');
                    }
                },
                error: () => {
                    // Fallback: try to get patient directly
                    this.http.get<any>(`${this.apiUrl}/users/${pid}`).subscribe({
                        next: (user) => {
                            this.patientName.set(`${user.prenom || ''} ${user.nom || ''}`.trim() || 'Patient');
                        },
                        error: () => { }
                    });
                }
            });
        }
    }

    selectOption(option: string) {
        const q = this.currentQuestion();
        if (!q) return;
        this.answers.update(a => ({ ...a, [q.id]: option }));
    }

    getAnswer(id: number): string {
        return this.answers()[id] || '';
    }

    setAnswer(id: number, value: string) {
        this.answers.update(a => ({ ...a, [id]: value }));
    }

    goNext() {
        if (this.isLastQuestion()) this.finishTest();
        else this.currentIndex.update(i => i + 1);
    }

    goPrev() {
        if (this.currentIndex() > 0) this.currentIndex.update(i => i - 1);
    }

    private finishTest() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.finalScore.set(this.currentScore());
        this.isComplete.set(true);
        this.saveResults();
    }

    private saveResults() {
        const payload = {
            patientId: this.patientId(),
            testId: 1,
            assignationId: this.assignationId(),
            score: this.finalScore(),
            durationSeconds: this.elapsedSeconds(),
            answers: Object.entries(this.answers()).map(([qId, ans]) => ({
                questionId: parseInt(qId),
                answerText: ans
            }))
        };
        this.http.post(`${this.apiUrl}/tests/1/results`, payload).subscribe({ error: () => { } });
    }

    returnToDashboard() {
        this.router.navigate(['/tests-cognitifs']);
    }
}
