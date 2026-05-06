import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface TriItem {
    id: number;
    label: string;
    emoji: string;
    correctCategory: string;
}

interface TriCategory {
    id: string;
    label: string;
    emoji: string;
    color: string;
    items: TriItem[];
}

@Component({
    selector: 'app-test-tri-categories',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './test-tri-categories.component.html',
    styleUrls: ['./test-tri-categories.component.css']
})
export class TestTriCategoriesComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;
    private timerInterval: any;

    patientName = signal('Patient');
    patientId = signal<number>(0);
    assignationId = signal<number | null>(null);
    elapsedSeconds = signal(0);
    isComplete = signal(false);
    finalScore = signal(0);
    draggedItemId = signal<number | null>(null);

    allItems: TriItem[] = [
        { id: 1, label: 'Pomme', emoji: '🍎', correctCategory: 'Fruits' },
        { id: 2, label: 'Banane', emoji: '🍌', correctCategory: 'Fruits' },
        { id: 3, label: 'Orange', emoji: '🍊', correctCategory: 'Fruits' },
        { id: 4, label: 'Carotte', emoji: '🥕', correctCategory: 'Légumes' },
        { id: 5, label: 'Tomate', emoji: '🍅', correctCategory: 'Légumes' },
        { id: 6, label: 'Brocoli', emoji: '🥦', correctCategory: 'Légumes' },
        { id: 7, label: 'Chat', emoji: '🐱', correctCategory: 'Animaux' },
        { id: 8, label: 'Chien', emoji: '🐶', correctCategory: 'Animaux' },
    ];

    poolItems = signal<TriItem[]>([...this.allItems]);

    categories = signal<TriCategory[]>([
        { id: 'Fruits', label: 'Fruits', emoji: '🍎', color: '#FF6B6B', items: [] },
        { id: 'Légumes', label: 'Légumes', emoji: '🥕', color: '#6BCB77', items: [] },
        { id: 'Animaux', label: 'Animaux', emoji: '🐾', color: '#4D96FF', items: [] },
    ]);

    progressPercentage = computed(() => {
        const placed = this.allItems.length - this.poolItems().length;
        return Math.round((placed / this.allItems.length) * 100);
    });

    currentScore = computed(() => {
        let correct = 0;
        this.categories().forEach(cat => {
            cat.items.forEach(item => {
                if (item.correctCategory === cat.id) correct++;
            });
        });
        return correct;
    });

    formattedTime = computed(() => {
        const m = Math.floor(this.elapsedSeconds() / 60);
        const s = this.elapsedSeconds() % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    });

    allPlaced = computed(() => this.poolItems().length === 0);

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            if (params['patientId']) this.patientId.set(+params['patientId']);
            if (params['assignationId']) this.assignationId.set(+params['assignationId']);
            this.loadPatientInfo();
        });
        this.startTimer();
        this.shufflePool();
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

    shufflePool() {
        this.poolItems.update(items => [...items].sort(() => Math.random() - 0.5));
    }

    onDragStartItem(itemId: number) { this.draggedItemId.set(itemId); }
    onDragOver(event: DragEvent) { event.preventDefault(); }

    onDropOnCategory(event: DragEvent, categoryId: string) {
        event.preventDefault();
        const itemId = this.draggedItemId();
        if (itemId === null) return;

        let item = this.poolItems().find(i => i.id === itemId);

        if (!item) {
            this.categories.update(cats => {
                let foundItem: TriItem | undefined;
                cats = cats.map(cat => {
                    const idx = cat.items.findIndex(i => i.id === itemId);
                    if (idx !== -1) {
                        foundItem = cat.items[idx];
                        return { ...cat, items: cat.items.filter(i => i.id !== itemId) };
                    }
                    return cat;
                });
                if (foundItem) {
                    item = foundItem;
                    cats = cats.map(cat => {
                        if (cat.id === categoryId) return { ...cat, items: [...cat.items, foundItem!] };
                        return cat;
                    });
                }
                return cats;
            });
        } else {
            this.poolItems.update(items => items.filter(i => i.id !== itemId));
            this.categories.update(cats => cats.map(cat => {
                if (cat.id === categoryId) return { ...cat, items: [...cat.items, item!] };
                return cat;
            }));
        }
        this.draggedItemId.set(null);
    }

    onDropOnPool(event: DragEvent) {
        event.preventDefault();
        const itemId = this.draggedItemId();
        if (itemId === null) return;
        this.categories.update(cats => cats.map(cat => {
            const idx = cat.items.findIndex(i => i.id === itemId);
            if (idx !== -1) {
                const item = cat.items[idx];
                this.poolItems.update(pool => [...pool, item]);
                return { ...cat, items: cat.items.filter(i => i.id !== itemId) };
            }
            return cat;
        }));
        this.draggedItemId.set(null);
    }

    isItemCorrect(item: TriItem, categoryId: string): boolean {
        return item.correctCategory === categoryId;
    }

    finishTest() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.finalScore.set(this.currentScore());
        this.isComplete.set(true);
        this.saveResults();
    }

    private saveResults() {
        const payload = {
            patientId: this.patientId(),
            testId: 19,
            assignationId: this.assignationId(),
            score: this.finalScore(),
            durationSeconds: this.elapsedSeconds(),
        };
        this.http.post(`${this.apiUrl}/tests/19/results`, payload).subscribe({ error: () => { } });
    }

    returnToDashboard() { this.router.navigate(['/tests-cognitifs']); }
}
