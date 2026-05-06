import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Stat {
  value: number;
  suffix: string;
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {

  stats: Stat[] = [
    { value: 55,  suffix: 'M+', label: 'People living with dementia worldwide',  icon: '🌍', color: '#6C2EB9' },
    { value: 20,  suffix: '%',  label: 'Adults 65+ affected by MCI',              icon: '🧠', color: '#0ea5e9' },
    { value: 40,  suffix: '%',  label: 'Better outcomes with early detection',    icon: '📈', color: '#10b981' },
    { value: 3,   suffix: 'in 3', label: 'Seniors die with Alzheimer\'s or dementia', icon: '❤️', color: '#f59e0b' },
  ];

  displayValues: number[] = [0, 0, 0, 0];
  private animInterval: ReturnType<typeof setInterval> | null = null;

  features = [
    { icon: '🗺️', title: 'Smart Geo-Tracking', desc: 'Real-time location monitoring with authorized zones and safe areas for patients.' },
    { icon: '🤖', title: 'AI Diagnostics',      desc: 'Advanced AI analysis to detect cognitive changes early with high accuracy.' },
    { icon: '📊', title: 'Live Statistics',     desc: 'Detailed dashboards with cognitive scores, risk levels, and progress tracking.' },
    { icon: '🔔', title: 'Instant Alerts',      desc: 'Caregivers receive real-time notifications when patients leave safe zones.' },
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    setTimeout(() => this.animateCounters(), 400);
  }

  ngOnDestroy(): void {
    if (this.animInterval) clearInterval(this.animInterval);
  }

  private animateCounters(): void {
    const duration = 1800;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;

    this.animInterval = setInterval(() => {
      step++;
      const progress = this.easeOut(step / steps);
      this.displayValues = this.stats.map(s => Math.round(s.value * progress));
      this.cdr.markForCheck();
      if (step >= steps) {
        this.displayValues = this.stats.map(s => s.value);
        clearInterval(this.animInterval!);
      }
    }, interval);
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
