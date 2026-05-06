import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PatientHeaderData {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  stage: 'Early' | 'Moderate' | 'Advanced';
  adherenceRate: number;
  globalRiskScore: number; // 0-100
  unresolvedAlerts?: number;
  photo?: string;
}

@Component({
  selector: 'app-patient-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="rounded-2xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-[#C0E0DE]/40">
      <div class="flex flex-col md:flex-row gap-6 md:gap-8">
        
        <!-- Left: Avatar + Basic Info -->
        <div class="flex shrink-0 flex-col items-center md:items-start">
          <div 
            class="flex h-32 w-32 md:h-28 md:w-28 items-center justify-center rounded-2xl text-4xl font-bold text-white"
            [ngClass]="avatarBgClass">
            {{ initials }}
          </div>
          <span 
            class="mt-3 rounded-full px-4 py-1.5 text-xs font-semibold"
            [ngClass]="stageBadgeClass">
            {{ patient.stage }}
          </span>
        </div>

        <!-- Center: Patient Name & Age -->
        <div class="flex-1 space-y-2">
          <h1 class="text-3xl md:text-4xl font-bold text-[#541A75]">
            {{ patient.firstName }} {{ patient.lastName }}
          </h1>
          <p class="text-sm text-[#7E7F9A]">{{ patient.age }} ans</p>
          
          <!-- Global Risk Bar -->
          <div class="mt-4 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide text-[#7E7F9A]">Risque Global</span>
              <span class="text-lg font-bold" [ngClass]="riskScoreBadgeColorText">
                {{ patient.globalRiskScore }}%
              </span>
            </div>
            <div class="h-3 w-full rounded-full bg-[#C0E0DE]/20 overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-500"
                [style.width.%]="patient.globalRiskScore"
                [ngClass]="riskScoreBadgeColorBg">
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Unresolved Alerts Badge -->
        <div class="flex items-center justify-center md:items-end">
          <div class="text-center bg-[#CB1527]/10 rounded-2xl px-6 py-4 md:py-6 min-w-max">
            <p class="text-4xl md:text-5xl font-bold text-[#CB1527]">{{ patient.unresolvedAlerts ?? 0 }}</p>
            <p class="text-xs md:text-sm font-semibold text-[#CB1527] mt-2">Alertes non traitées</p>
          </div>
        </div>
      </div>
    </article>
  `,
  styles: []
})
export class PatientHeaderComponent implements OnInit {
  @Input() patient!: PatientHeaderData;

  initials = '';
  avatarBgClass = '';
  stageBadgeClass = '';
  adherenceBadgeColorText = '';
  adherenceBadgeColorBg = '';
  riskScoreBadgeColorText = '';
  riskScoreBadgeColorBg = '';

  ngOnInit(): void {
    this.initials = `${this.patient.firstName[0]?.toUpperCase() ?? ''}${this.patient.lastName[0]?.toUpperCase() ?? ''}`;
    this.updateClasses();
  }

  private updateClasses(): void {
    // Stage badge
    switch (this.patient.stage) {
      case 'Early':
        this.stageBadgeClass = 'bg-[#C0E0DE]/70 text-[#00635D]';
        this.avatarBgClass = 'bg-[#C0E0DE] text-[#00635D]';
        break;
      case 'Moderate':
        this.stageBadgeClass = 'bg-[#541A75]/10 text-[#541A75]';
        this.avatarBgClass = 'bg-[#541A75]/20 text-[#541A75]';
        break;
      case 'Advanced':
        this.stageBadgeClass = 'bg-[#CB1527]/10 text-[#CB1527]';
        this.avatarBgClass = 'bg-[#CB1527]/20 text-[#CB1527]';
        break;
    }

    // Adherence badge colors
    if (this.patient.adherenceRate >= 80) {
      this.adherenceBadgeColorText = 'text-[#00635D]';
      this.adherenceBadgeColorBg = 'bg-[#00635D]';
    } else if (this.patient.adherenceRate < 60) {
      this.adherenceBadgeColorText = 'text-[#CB1527]';
      this.adherenceBadgeColorBg = 'bg-[#CB1527]';
    } else {
      this.adherenceBadgeColorText = 'text-[#541A75]';
      this.adherenceBadgeColorBg = 'bg-[#541A75]';
    }

    // Risk score colors (inverse: higher = worse)
    if (this.patient.globalRiskScore >= 70) {
      this.riskScoreBadgeColorText = 'text-[#CB1527]';
      this.riskScoreBadgeColorBg = 'bg-[#CB1527]';
    } else if (this.patient.globalRiskScore >= 40) {
      this.riskScoreBadgeColorText = 'text-[#541A75]';
      this.riskScoreBadgeColorBg = 'bg-[#541A75]';
    } else {
      this.riskScoreBadgeColorText = 'text-[#00635D]';
      this.riskScoreBadgeColorBg = 'bg-[#00635D]';
    }
  }
}
