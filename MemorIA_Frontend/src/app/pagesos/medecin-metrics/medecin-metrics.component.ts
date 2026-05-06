import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AssignationService } from '../../services/assignation.service';
import { TestResultService } from '../../services/test-result.service';
import { LucideAngularModule, 
  Users, 
  Calendar, 
  ChevronRight, 
  AlertTriangle, 
  Activity, 
  Brain, 
  Clock, 
  FileText, 
  BarChart, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2 
} from 'lucide-angular';

interface DoctorStats {
  totalPatients: number;
  newThisMonth: number;
  stage1: number;
  stage2: number;
  stage3: number;
  totalTests: number;
  completedTests: number;
  avgScore: number;
  successRate: number;
}

interface PatientSummary {
  id: number;
  name: string;
  age: number;
  stage: string;
  lastTest: string;
  lastScore: number;
  trend: 'up' | 'down' | 'stable';
  nextAppointment: string;
}

interface RecentTest {
  patientName: string;
  testName: string;
  date: string;
  score: number;
  duration: string;
  status: 'completed' | 'in-progress' | 'assigned';
}

@Component({
  selector: 'app-medecin-metrics',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './medecin-metrics.component.html',
  styleUrl: './medecin-metrics.component.css'
})
export class MedecinMetricsComponent implements OnInit {
  public router = inject(Router);
  private assignationService = inject(AssignationService);
  private testResultService = inject(TestResultService);

  // Icons
  readonly icons = {
    Users, Calendar, ChevronRight, AlertTriangle, Activity, Brain, Clock, 
    FileText, BarChart, TrendingUp, TrendingDown, CheckCircle2
  };

  // Signals
  selectedPeriod = signal<'current' | '6months' | '12months' | 'all'>('current');
  doctorStats = signal<DoctorStats>({
    totalPatients: 0,
    newThisMonth: 0,
    stage1: 0,
    stage2: 0,
    stage3: 0,
    totalTests: 0,
    completedTests: 0,
    avgScore: 0,
    successRate: 0
  });
  patientSummaries = signal<PatientSummary[]>([]);
  recentTests = signal<RecentTest[]>([]);
  isLoading = signal(true);

  // Computed properties
  successRate = computed(() => {
    const stats = this.doctorStats();
    return stats.totalTests > 0 ? Math.round((stats.completedTests / stats.totalTests) * 100) : 0;
  });

  avgScore = computed(() => {
    const stats = this.doctorStats();
    return stats.avgScore;
  });

  ngOnInit(): void {
    this.loadDoctorMetrics();
  }

  loadDoctorMetrics(): void {
    this.isLoading.set(true);
    
    // Charger les patients et leurs données
    this.assignationService.getAllPatientsWithMedecin().subscribe({
      next: (patients) => {
        console.log('[DEBUG] Patients chargés pour métriques médecin:', patients);
        this.processPatientsData(patients);
        this.loadRecentTests();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement patients pour métriques médecin', err);
        this.isLoading.set(false);
        // Fallback avec données mock
        this.loadMockData();
      }
    });
  }

  private processPatientsData(patients: any[]): void {
    const stats: DoctorStats = {
      totalPatients: patients.length,
      newThisMonth: patients.filter(p => this.isNewThisMonth(p.dateNaissance)).length,
      stage1: 0,
      stage2: 0,
      stage3: 0,
      totalTests: 0,
      completedTests: 0,
      avgScore: 0,
      successRate: 0
    };

    const summaries: PatientSummary[] = patients.map(patient => ({
      id: patient.id,
      name: `${patient.prenom} ${patient.nom}`,
      age: this.calculateAge(patient.dateNaissance),
      stage: this.getPatientStage(patient),
      lastTest: this.getLastTestDate(patient),
      lastScore: this.getLastTestScore(patient),
      trend: this.getPatientTrend(patient),
      nextAppointment: this.getNextAppointment(patient)
    }));

    // Compter les stages
    summaries.forEach(s => {
      if (s.stage.includes('STAGE 1')) stats.stage1++;
      else if (s.stage.includes('STAGE 2')) stats.stage2++;
      else if (s.stage.includes('STAGE 3')) stats.stage3++;
    });

    this.doctorStats.set(stats);
    this.patientSummaries.set(summaries);
  }

  private loadRecentTests(): void {
    // Charger les tests récents pour tous les patients
    const patientIds = this.patientSummaries().map(p => p.id);
    if (patientIds.length === 0) return;

    // Pour la démo, on utilise le premier patient
    if (patientIds.length > 0) {
      this.testResultService.getByPatient(patientIds[0]).subscribe({
        next: (results) => {
          const recent = results.slice(0, 5).map(r => ({
            patientName: this.patientSummaries().find(p => p.id === patientIds[0])?.name || 'Patient',
            testName: r.test?.titre || 'Test Cognitif',
            date: r.testDate || new Date().toISOString().split('T')[0],
            score: r.scoreTotale || 0,
            duration: r.durationSeconds ? `${Math.floor(r.durationSeconds / 60)} min` : 'N/A',
            status: 'completed' as const
          }));
          this.recentTests.set(recent);
        },
        error: (err) => console.error('Erreur chargement tests récents', err)
      });
    }
  }

  private loadMockData(): void {
    const mockStats: DoctorStats = {
      totalPatients: 25,
      newThisMonth: 3,
      stage1: 12,
      stage2: 8,
      stage3: 5,
      totalTests: 45,
      completedTests: 38,
      avgScore: 18.5,
      successRate: 84
    };

    const mockSummaries: PatientSummary[] = [
      {
        id: 92,
        name: 'Robert Lefebvre',
        age: 82,
        stage: 'STAGE 2 — SURVEILLANCE',
        lastTest: '2024-02-15',
        lastScore: 22,
        trend: 'down',
        nextAppointment: '2024-03-05'
      },
      {
        id: 93,
        name: 'Marguerite Moreau',
        age: 86,
        stage: 'STAGE 1 — STABLE',
        lastTest: '2024-02-18',
        lastScore: 27,
        trend: 'stable',
        nextAppointment: '2024-03-10'
      }
    ];

    this.doctorStats.set(mockStats);
    this.patientSummaries.set(mockSummaries);
  }

  // Helper methods
  private isNewThisMonth(dateNaissance: string): boolean {
    // Logique simplifiée pour la démo
    return Math.random() > 0.8;
  }

  private calculateAge(dateNaissance: string): number {
    if (!dateNaissance) return 75;
    const birth = new Date(dateNaissance);
    const today = new Date();
    return today.getFullYear() - birth.getFullYear();
  }

  private getPatientStage(patient: any): string {
    // Logique simplifiée pour la démo
    const stages = ['STAGE 1 — STABLE', 'STAGE 2 — SURVEILLANCE', 'STAGE 3 — CRITIQUE'];
    return stages[Math.floor(Math.random() * stages.length)];
  }

  private getLastTestDate(patient: any): string {
    // Logique simplifiée pour la démo
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    return date.toISOString().split('T')[0];
  }

  private getLastTestScore(patient: any): number {
    // Logique simplifiée pour la démo
    return Math.floor(Math.random() * 30);
  }

  private getPatientTrend(patient: any): 'up' | 'down' | 'stable' {
    const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private getNextAppointment(patient: any): string {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1);
    return date.toISOString().split('T')[0];
  }

  // Navigation methods
  openCalendar(): void {
    this.router.navigate(['/calendar'], { queryParams: { medecinId: 55 } });
  }

  viewPatientDetails(patientId: number): void {
    this.router.navigate(['/tests-cognitifs'], { 
      queryParams: { role: 'patient', patientId } 
    });
  }

  exportToCSV(): void {
    const stats = this.doctorStats();
    const patients = this.patientSummaries();
    
    let csv = 'MÉTRIQUES MÉDECIN\n\n';
    csv += 'STATISTIQUES GÉNÉRALES\n';
    csv += `Total Patients,${stats.totalPatients}\n`;
    csv += `Nouveaux ce mois,${stats.newThisMonth}\n`;
    csv += `Stage 1 (Stable),${stats.stage1}\n`;
    csv += `Stage 2 (Surveillance),${stats.stage2}\n`;
    csv += `Stage 3 (Critique),${stats.stage3}\n`;
    csv += `Taux de réussite,${this.successRate()}%\n`;
    csv += `Score moyen,${this.avgScore()}\n\n`;
    
    csv += 'PATIENTS\n';
    csv += 'Nom,Age,Stage,Dernier test,Dernier score,Tendance,Prochain RDV\n';
    patients.forEach(p => {
      csv += `${p.name},${p.age},${p.stage},${p.lastTest},${p.lastScore},${p.trend},${p.nextAppointment}\n`;
    });

    this.downloadCSV(csv, 'medecin-metrics.csv');
  }

  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
}
