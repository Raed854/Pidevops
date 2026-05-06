import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MetricsService, AidantMetrics, ScoreGlobal } from '../../services/metrics.service';
import { LucideAngularModule, TrendingUp, Users, CheckCircle, BarChart3, Calendar, Filter, Activity } from 'lucide-angular';

@Component({
  selector: 'app-aidant-metrics',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './aidant-metrics.component.html',
  styleUrls: ['./aidant-metrics.component.css']
})
export class AidantMetricsComponent implements OnInit {
  readonly icons = { TrendingUp, Users, CheckCircle, BarChart3, Calendar, Filter, Activity };

  metrics     = signal<AidantMetrics | null>(null);
  scoreGlobal = signal<ScoreGlobal | null>(null);
  aidantId    = signal<number | null>(null);
  selectedPeriod = signal<'current' | '6' | '12' | 'all'>('6');

  avgScoreByTypeEntries = computed(() => {
    const m = this.metrics();
    return m ? Object.entries(m.avgScoreByType) : [];
  });

  monthlyCountsEntries = computed(() => {
    const m = this.metrics();
    if (!m) return [];
    const all = Object.entries(m.monthlyCounts);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    switch (this.selectedPeriod()) {
      case 'current': return all.filter(([k]) => k === currentMonth);
      case '6':       return all.slice(-6);
      case '12':      return all.slice(-12);
      default:        return all;
    }
  });

  scoreGlobalEntries = computed(() => {
    const sg = this.scoreGlobal();
    return sg ? Object.entries(sg.scoreByType) : [];
  });

  /** Classes CSS Tailwind selon le code couleur du score global */
  scoreGlobalClasses = computed(() => {
    const sg = this.scoreGlobal();
    if (!sg || sg.status === 'NON_EVALUABLE') return { badge: 'bg-gray-100 text-gray-500', bar: 'bg-gray-300' };
    if (sg.colorCode === 'VERT')   return { badge: 'bg-green-100 text-green-700',  bar: 'bg-green-500'  };
    if (sg.colorCode === 'JAUNE')  return { badge: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-500' };
    return                                { badge: 'bg-red-100 text-red-700',       bar: 'bg-red-500'    };
  });

  avgScore = computed(() => {
    const m = this.metrics();
    if (!m || m.totalCompleted === 0) return 0;
    const entries = Object.values(m.avgScoreByType);
    if (!entries.length) return 0;
    return entries.reduce((s, v) => s + v, 0) / entries.length;
  });

  successRate = computed(() => {
    const m = this.metrics();
    if (!m || m.totalCompleted === 0) return 0;
    const positiveScores = Object.values(m.avgScoreByType).filter(v => v > 0).length;
    return (positiveScores / m.totalCompleted) * 100;
  });

  constructor(
    private route: ActivatedRoute,
    private metricsService: MetricsService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const id = params['aidantId'];
      if (id) {
        const aidantId = Number(id);
        this.aidantId.set(aidantId);

        this.metricsService.getMetricsForAidant(aidantId).subscribe({
          next: data => this.metrics.set(data),
          error: err => console.error('Erreur métriques aidant', err)
        });

        this.metricsService.getScoreGlobalForAidant(aidantId).subscribe({
          next: data => this.scoreGlobal.set(data),
          error: err => console.error('Erreur score global', err)
        });
      }
    });
  }

  exportToCSV() {
    const m  = this.metrics();
    const sg = this.scoreGlobal();
    if (!m) return;

    const rows: string[][] = [
      ['Métrique', 'Valeur'],
      ['Total assigné', String(m.totalAssigned)],
      ['Total complété', String(m.totalCompleted)],
      ['Taux réussite (%)', m.successRate.toFixed(2)],
    ];

    if (sg?.status === 'OK') {
      rows.push(['Score global composite (z)', String(sg.globalScore)]);
      rows.push(['Interprétation', sg.interpretation]);
      rows.push(['Nombre de tests', String(sg.testCount)]);
      rows.push(['']);
      rows.push(['Score par type de test (z-score)']);
      for (const [type, z] of Object.entries(sg.scoreByType)) {
        rows.push([type, String(z)]);
      }
    }

    rows.push(['']);
    rows.push(['Évolution mensuelle (période : ' + this.selectedPeriod() + ')']);
    for (const [month, count] of this.monthlyCountsEntries()) {
      rows.push([month, String(count)]);
    }

    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `aidant-metrics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
