import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Proche {
    id: number;
    photoUrl: string;
    emoji: string;
    correctName: string;
    correctRelation: string;
    userAnswerName: string;
    userAnswerRelation: string;
}

@Component({
    selector: 'app-test-reconnaissance-proches',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './test-reconnaissance-proches.component.html',
    styleUrls: ['./test-reconnaissance-proches.component.css']
})
export class TestReconnaissanceProchesComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;
    private timerInterval: any;

    patientName = signal('Patient');
    patientId = signal<number>(0);
    assignationId = signal<number | null>(null);
    elapsedSeconds = signal(0);
    currentIndex = signal(0);
    isComplete = signal(false);
    finalScore = signal(0);

    proches: Proche[] = [
        { id: 1, photoUrl: '', emoji: '👴', correctName: 'Jacques Martin', correctRelation: 'Père', userAnswerName: '', userAnswerRelation: '' },
        { id: 2, photoUrl: '', emoji: '👵', correctName: 'Marie Martin', correctRelation: 'Mère', userAnswerName: '', userAnswerRelation: '' },
        { id: 3, photoUrl: '', emoji: '👨', correctName: 'Pierre Martin', correctRelation: 'Frère', userAnswerName: '', userAnswerRelation: '' },
        { id: 4, photoUrl: '', emoji: '👩', correctName: 'Sophie Martin', correctRelation: 'Sœur', userAnswerName: '', userAnswerRelation: '' },
        { id: 5, photoUrl: '', emoji: '🧑', correctName: 'Lucas Martin', correctRelation: 'Fils', userAnswerName: '', userAnswerRelation: '' },
        { id: 6, photoUrl: '', emoji: '👧', correctName: 'Emma Martin', correctRelation: 'Fille', userAnswerName: '', userAnswerRelation: '' },
    ];

    totalProches = computed(() => this.proches.length);
    currentProche = computed(() => this.proches[this.currentIndex()]);
    isLastProche = computed(() => this.currentIndex() === this.proches.length - 1);
    progressPercentage = computed(() => Math.round((this.currentIndex() / this.totalProches()) * 100));

    currentScore = computed(() => {
        let s = 0;
        this.proches.forEach(p => {
            if (p.userAnswerName.trim() !== '') s++;
            if (p.userAnswerRelation.trim() !== '') s++;
        });
        return s;
    });

    formattedTime = computed(() => {
        const m = Math.floor(this.elapsedSeconds() / 60);
        const s = this.elapsedSeconds() % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    });

    ngOnInit() {
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
                    this.http.get<any>(`${this.apiUrl}/users/${pid}`).subscribe({
                        next: (user) => this.patientName.set(`${user.prenom || ''} ${user.nom || ''}`.trim() || 'Patient'),
                        error: () => { }
                    });
                }
            });
        }
    }

    goNext() {
        if (this.isLastProche()) this.finishTest();
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
            testId: 20,
            assignationId: this.assignationId(),
            score: this.finalScore(),
            durationSeconds: this.elapsedSeconds(),
            answers: this.proches.map(p => ({
                personId: p.id,
                name: p.userAnswerName,
                relation: p.userAnswerRelation
            }))
        };
        this.http.post(`${this.apiUrl}/tests/20/results`, payload).subscribe({ error: () => { } });
    }

    returnToDashboard() {
        this.router.navigate(['/tests-cognitifs']);
    }
}