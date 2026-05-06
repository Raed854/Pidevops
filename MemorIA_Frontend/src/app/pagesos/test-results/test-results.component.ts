import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Trophy, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-angular';
import { TestService } from '../../services/test.service';
import { TestSession, Test, TestSessionStatus } from '../../models/test-models';

@Component({
  selector: 'app-test-results',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule
  ],
  templateUrl: './test-results.component.html',
  styleUrl: './test-results.component.css'
})
export class TestResultsComponent implements OnInit {
  // Icons
  readonly icons = {
    ArrowLeft,
    Trophy,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertCircle
  };

  // Data
  session: TestSession | null = null;
  test: Test | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testService: TestService
  ) {}

  ngOnInit(): void {
    this.loadTestResults();
  }

  private loadTestResults(): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    
    if (!sessionId) {
      this.router.navigate(['/tests-cognitifs']);
      return;
    }

    this.session = this.testService.getSessionById(sessionId);
    
    if (!this.session) {
      this.isLoading = false;
      return;
    }

    // Mock test data - in real app, fetch from backend
    this.test = this.getMockTest(this.session.testId);
    this.isLoading = false;
  }

  private getMockTest(testId: string): Test | null {
    const mockTests: Test[] = [
      {
        id: 'mmse_test',
        name: 'Test MMSE',
        type: 'MMSE' as any,
        category: 'COGNITIVE' as any,
        description: 'Mini Mental State Examination',
        durationMinutes: 30,
        totalQuestions: 30,
        difficulty: 'MEDIUM' as any,
        isPersonalized: false
      },
      {
        id: 'memory_test',
        name: 'Test de Mémoire',
        type: 'MEMORY' as any,
        category: 'MEMORY' as any,
        description: 'Évaluation des capacités de mémoire',
        durationMinutes: 20,
        totalQuestions: 10,
        difficulty: 'EASY' as any,
        isPersonalized: false
      }
    ];

    return mockTests.find(t => t.id === testId) || null;
  }

  goBack(): void {
    this.router.navigate(['/tests-cognitifs']);
  }

  retakeTest(): void {
    if (this.session && this.test) {
      this.router.navigate(['/test', this.test.id, 'patient', this.session.patientId]);
    }
  }

  // Utility Methods
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }

  getScoreColor(): string {
    if (!this.session?.score) return '#6b7280';
    if (this.session.score >= 80) return '#10b981';
    if (this.session.score >= 60) return '#f59e0b';
    return '#ef4444';
  }

  getPerformanceLevel(): string {
    if (!this.session?.score) return 'Non évalué';
    if (this.session.score >= 90) return 'Excellent';
    if (this.session.score >= 80) return 'Très bon';
    if (this.session.score >= 70) return 'Bon';
    if (this.session.score >= 60) return 'Moyen';
    return 'À améliorer';
  }

  getPerformanceMessage(): string {
    if (!this.session?.score) return '';
    
    if (this.session.score >= 90) {
      return 'Performance exceptionnelle ! Vos capacités cognitives sont excellentes.';
    }
    if (this.session.score >= 80) {
      return 'Très bon résultat ! Votre performance est supérieure à la moyenne.';
    }
    if (this.session.score >= 70) {
      return 'Bon résultat. Continuez à entretenir vos capacités cognitives.';
    }
    if (this.session.score >= 60) {
      return 'Résultat correct. Un entraînement régulier pourrait vous aider à vous améliorer.';
    }
    return 'Nous vous recommandons de consulter un professionnel pour évaluer davantage vos capacités.';
  }

  getStarRating(): number {
    if (!this.session?.score) return 0;
    if (this.session.score >= 90) return 5;
    if (this.session.score >= 80) return 4;
    if (this.session.score >= 70) return 3;
    if (this.session.score >= 60) return 2;
    return 1;
  }

  getCorrectAnswers(): number {
    if (!this.session || !this.test) return 0;
    return Math.round((this.session.score || 0) / 100 * this.test.totalQuestions);
  }

  getTotalTime(): number {
    if (!this.session?.startTime || !this.session?.endTime) return 0;
    return Math.floor((this.session.endTime.getTime() - this.session.startTime.getTime()) / 1000);
  }

  getRecommendations(): string[] {
    if (!this.session?.score) return [];
    
    const recommendations: string[] = [];
    
    if (this.session.score < 70) {
      recommendations.push('Pratiquez régulièrement des exercices de mémoire');
      recommendations.push('Maintenez une activité sociale régulière');
    }
    
    if (this.session.score < 80) {
      recommendations.push('Faites des puzzles et jeux de logique');
      recommendations.push('Apprenez de nouvelles choses régulièrement');
    }
    
    recommendations.push('Ayez une bonne hygiène de sommeil');
    recommendations.push('Pratiquez une activité physique régulière');
    
    return recommendations;
  }
}
