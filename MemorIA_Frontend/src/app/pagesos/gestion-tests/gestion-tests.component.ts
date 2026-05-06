import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Eye, Pencil, Trash2, Plus, Search, ChevronRight, ArrowLeft, FlaskConical, Brain, MessageSquare, Activity, Volume2, Filter, X } from 'lucide-angular';
import { CognitiveTestService } from '../../services/cognitive-test.service';
import { TestQuestionService } from '../../services/test-question.service';
import { TestResultService } from '../../services/test-result.service';
import { CognitiveTest, TestType, DifficultyLevel, TestQuestion } from '../../models/cognitive-models';

@Component({
    selector: 'app-gestion-tests',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        LucideAngularModule
    ],
    templateUrl: './gestion-tests.component.html',
    styleUrl: './gestion-tests.component.css'
})
export class GestionTestsComponent implements OnInit {
    private cognitiveTestService = inject(CognitiveTestService);
    private testQuestionService = inject(TestQuestionService); // Inject new service
    private router = inject(Router);

    tests = signal<CognitiveTest[]>([]);
    searchQuery = signal('');
    filterType = signal<string | null>(null);
    filterDifficulty = signal<string | null>(null);
    loading = signal(true);
    viewMode = signal<'list' | 'detail'>('list'); // New signal

    // Modal state
    showViewModal = signal(false);
    showEditModal = signal(false);
    showDeleteConfirm = signal(false);
    showQuestionDetail = signal(false);
    selectedTest = signal<CognitiveTest | null>(null);
    selectedQuestion = signal<TestQuestion | null>(null);
    typeQuestions = signal<TestQuestion[]>([]); // Typed correctly
    loadingQuestions = signal(false);

    // Grouping state for list view
    expandedTests = signal<Set<number>>(new Set());
    testQuestionsMap = signal<Record<number, TestQuestion[]>>({});
    loadingStateMap = signal<Record<number, boolean>>({});

    // Edit form state
    editForm = signal<Partial<CognitiveTest>>({});

    // Statistics logic
    stats = computed(() => {
        const allTests = this.tests();
        return {
            total: allTests.length,
            stable: allTests.filter(t => t.difficultyLevel === 'FACILE').length,
            moyen: allTests.filter(t => t.difficultyLevel === 'MOYEN').length,
            critique: allTests.filter(t => t.difficultyLevel === 'AVANCE').length
        };
    });

    readonly icons = {
        Eye,
        Pencil,
        Trash2,
        Plus,
        Search,
        ChevronRight,
        ArrowLeft,
        FlaskConical,
        Brain,
        MessageSquare,
        Activity,
        Volume2,
        Filter,
        XMark: X
    };

    readonly typeLabels: Record<string, string> = {
        'MEMORY': 'Mémoire',
        'LANGUAGE': 'Langage',
        'REFLECTION': 'Réflexion',
        'LOGIC': 'Logique',
        'AUDIO': 'Audio',
        'ATTENTION': 'Attention',
        'DRAWING': 'Dessin'
    };

    readonly difficultyLabels: Record<string, string> = {
        'FACILE': 'Stable (Facile)',
        'MOYEN': 'Moyen',
        'AVANCE': 'Critique (Avancé)'
    };

    readonly testTypes = Object.values(TestType);
    readonly difficultyLevels = Object.values(DifficultyLevel);

    ngOnInit() {
        this.loadTests();
    }

    loadTests() {
        this.loading.set(true);
        const filters = {
            type: this.filterType() || undefined,
            difficulty: this.filterDifficulty() || undefined,
            search: this.searchQuery() || undefined
        };

        this.cognitiveTestService.getAll(filters).subscribe({
            next: (tests) => {
                this.tests.set(tests);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error loading tests', err);
                this.loading.set(false);
            }
        });
    }

    onFilterChange() {
        this.loadTests();
    }

    get filteredTests(): CognitiveTest[] {
        // Now filtering is server-side, but we keep this as a proxy for the signal
        return this.tests();
    }

    getTypeLabel(type: string): string {
        return this.typeLabels[type] || type;
    }

    getDifficultyLabel(level: string): string {
        return this.difficultyLabels[level] || level;
    }

    getDifficultyClass(level?: DifficultyLevel): string {
        switch (level) {
            case DifficultyLevel.FACILE: return 'stable';
            case DifficultyLevel.MOYEN: return 'moyen';
            case DifficultyLevel.AVANCE: return 'critique';
            default: return '';
        }
    }

    getTypeIcon(type: string) {
        switch (type) {
            case 'MEMORY': return this.icons.Brain;
            case 'LANGUAGE': return this.icons.MessageSquare;
            case 'AUDIO': return this.icons.Volume2;
            default: return this.icons.Activity;
        }
    }

    // Actions
    viewTest(test: CognitiveTest) {
        this.selectedTest.set(test);
        this.viewMode.set('detail');
        this.typeQuestions.set([]); // Reset questions
        if (test.id) {
            this.fetchQuestionsForTestCard(test.id);
        }
    }

    toggleExpand(test: CognitiveTest, event: Event) {
        event.stopPropagation();
        const testId = test.id;
        if (!testId) return;

        const currentExpanded = new Set(this.expandedTests());
        if (currentExpanded.has(testId)) {
            currentExpanded.delete(testId);
        } else {
            currentExpanded.add(testId);
            // Fetch questions if not already loaded
            if (!this.testQuestionsMap()[testId]) {
                this.fetchQuestionsForTestCard(testId);
            }
        }
        this.expandedTests.set(currentExpanded);
    }

    fetchQuestionsForTestCard(testId: number) {
        this.loadingStateMap.set({ ...this.loadingStateMap(), [testId]: true });
        this.testQuestionService.getByTestId(testId).subscribe({
            next: (questions) => {
                this.testQuestionsMap.set({ ...this.testQuestionsMap(), [testId]: questions });
                this.loadingStateMap.set({ ...this.loadingStateMap(), [testId]: false });
            },
            error: (err) => {
                console.error('Error fetching questions for test ' + testId, err);
                this.loadingStateMap.set({ ...this.loadingStateMap(), [testId]: false });
            }
        });
    }

    isExpanded(testId: number): boolean {
        return this.expandedTests().has(testId);
    }

    getQuestionsForTest(testId: number): TestQuestion[] {
        return this.testQuestionsMap()[testId] || [];
    }

    isQuestionsLoading(testId: number): boolean {
        return this.loadingStateMap()[testId] || false;
    }

    // Keep for potential manual refresh if needed, but renamed for clarity
    refreshQuestions() {
        const test = this.selectedTest();
        if (test && test.id) {
            this.fetchQuestionsForTestCard(test.id);
        }
    }

    editTest(test: CognitiveTest) {
        this.selectedTest.set(test);
        this.editForm.set({ ...test });
        this.showEditModal.set(true);
    }

    confirmDelete(test: CognitiveTest) {
        this.selectedTest.set(test);
        this.showDeleteConfirm.set(true);
    }

    viewQuestionDetail(q: TestQuestion, event: Event) {
        event.stopPropagation();
        this.selectedQuestion.set(q);
        this.showQuestionDetail.set(true);
    }

    closeModals() {
        this.showViewModal.set(false);
        this.showEditModal.set(false);
        this.showDeleteConfirm.set(false);
        this.showQuestionDetail.set(false);
        this.viewMode.set('list');
        this.selectedTest.set(null);
        this.selectedQuestion.set(null);
        this.editForm.set({});
    }

    updateEditField(field: string, value: any) {
        const current = this.editForm();
        this.editForm.set({ ...current, [field]: value });
    }

    openEditFromView() {
        const test = this.selectedTest();
        if (test) {
            this.showViewModal.set(false);
            this.editTest(test);
        }
    }

    saveEdit() {
        const test = this.selectedTest();
        const form = this.editForm();
        if (test?.id && form) {
            this.cognitiveTestService.update(test.id, form as CognitiveTest).subscribe({
                next: () => {
                    this.loadTests();
                    this.closeModals();
                },
                error: (err) => console.error('Error updating test', err)
            });
        }
    }

    deleteTest() {
        const test = this.selectedTest();
        if (test?.id) {
            this.cognitiveTestService.delete(test.id).subscribe({
                next: () => {
                    this.loadTests();
                    this.closeModals();
                },
                error: (err) => console.error('Error deleting test', err)
            });
        }
    }

    clearFilters() {
        this.searchQuery.set('');
        this.filterType.set(null);
        this.filterDifficulty.set(null);
        this.loadTests();
    }

    goBack() {
        this.router.navigate(['/tests-cognitifs']);
    }
}
