import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface DiagnosticSummary {
  idDiagnostic: number;
  titre: string;
  dateDiagnostic: string;
  aiScore: number | null;
  riskLevel: string;
  pourcentageAlzeimer: number | null;
  patientName?: string;
}

interface DiagnosticStatistics {
  totalDiagnostics: number;
  averageScore: number;
  highestScore: number;
  lastScore: number;
  countByRiskLevel: { [key: string]: number };
  percentageByRiskLevel: { [key: string]: number };
  diagnostics: DiagnosticSummary[];
}

@Component({
  selector: 'app-stastique-diagnostic',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stastique-diagnostic.component.html',
  styleUrl: './stastique-diagnostic.component.css'
})
export class StastiqueDiagnosticComponent implements OnInit, AfterViewInit {

  @ViewChild('scoreChart') scoreChartRef!: ElementRef<HTMLCanvasElement>;

  statistics: DiagnosticStatistics | null = null;
  loading = true;
  errorMessage = '';
  private chart: Chart | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    // SOIGNANT → global stats across all patients
    // others → only their own stats
    if (user.role.toUpperCase() === 'SOIGNANT') {
      this.loadGlobalStatistics();
    } else {
      this.loadStatistics(user.id);
    }
  }

  ngAfterViewInit(): void {}

  loadGlobalStatistics(): void {
    this.loading = true;
    this.http.get<DiagnosticStatistics>('http://localhost:9090/api/diagnostics/statistics').subscribe({
      next: (data) => {
        this.statistics = data;
        this.loading = false;
        setTimeout(() => this.buildChart(), 0);
      },
      error: () => {
        this.errorMessage = 'Unable to load statistics. Please try again.';
        this.loading = false;
      }
    });
  }

  loadStatistics(userId: number): void {
    this.loading = true;
    this.http.get<DiagnosticStatistics>(`http://localhost:9090/api/diagnostics/user/${userId}/statistics`).subscribe({
      next: (data) => {
        this.statistics = data;
        this.loading = false;
        setTimeout(() => this.buildChart(), 0);
      },
      error: () => {
        this.errorMessage = 'Unable to load statistics. Please try again.';
        this.loading = false;
      }
    });
  }

  buildChart(): void {
    if (!this.scoreChartRef || !this.statistics || this.statistics.diagnostics.length === 0) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const labels = this.statistics.diagnostics.map((d, i) =>
      d.patientName ? `${d.patientName} #${i + 1}` : `Diagnostic ${i + 1}`
    );
    const scores = this.statistics.diagnostics.map(d => d.aiScore ?? 0);

    const colors = scores.map(score => {
      if (score >= 75) return '#22c55e';
      if (score >= 50) return '#f59e0b';
      if (score >= 25) return '#f97316';
      return '#ef4444';
    });

    this.chart = new Chart(this.scoreChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Score AI (%)',
          data: scores,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 14, weight: 'bold' },
              color: '#374151'
            }
          },
          tooltip: {
            callbacks: {
              title: (items: import('chart.js').TooltipItem<'bar'>[]) => {
                const idx = items[0].dataIndex;
                const d = this.statistics!.diagnostics[idx];
                return d.titre || `Diagnostic ${idx + 1}`;
              },
              label: (item: import('chart.js').TooltipItem<'bar'>) => {
                const idx = item.dataIndex;
                const d = this.statistics!.diagnostics[idx];
                const lines = [`Score AI: ${item.raw}%`];
                if (d.patientName) lines.push(`Patient: ${d.patientName}`);
                if (d.riskLevel) lines.push(`Risk: ${d.riskLevel}`);
                if (d.dateDiagnostic) lines.push(`Date: ${new Date(d.dateDiagnostic).toLocaleDateString('fr-FR')}`);
                return lines;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Diagnostic Number',
              font: { size: 14, weight: 'bold' },
              color: '#374151'
            },
            ticks: { color: '#6b7280' },
            grid: { display: false }
          },
          y: {
            title: {
              display: true,
              text: 'Score AI (%)',
              font: { size: 14, weight: 'bold' },
              color: '#374151'
            },
            min: 0,
            max: 100,
            ticks: { stepSize: 10, color: '#6b7280' },
            grid: { color: '#e5e7eb' }
          }
        }
      }
    });
  }

  readonly riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  getRiskLabel(level: string): string {
    const labels: Record<string, string> = {
      LOW: 'Low', MEDIUM: 'Moderate', HIGH: 'High', CRITICAL: 'Critical'
    };
    return labels[level] ?? level;
  }

  getRiskCount(level: string): number {
    return this.statistics?.countByRiskLevel?.[level] ?? 0;
  }

  getRiskPercentage(level: string): number {
    return this.statistics?.percentageByRiskLevel?.[level] ?? 0;
  }

  goBack(): void {
    this.router.navigate(['/dashboard_diagnostic']);
  }
}
