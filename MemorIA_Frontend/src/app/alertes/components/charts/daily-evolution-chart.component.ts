import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';

export interface DailyData {
  hours: string[];
  count: number[];
}

@Component({
  selector: 'app-daily-evolution-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="rounded-2xl bg-gradient-to-br from-white to-[#f8fbfb] p-6 shadow-md ring-1 ring-[#C0E0DE]/30">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <span class="text-2xl">📊</span>
      <div>
        <h3 class="font-bold text-lg text-[#541A75]">Daily Evolution</h3>
        <p class="text-xs text-[#7E7F9A] mt-0.5">Last 24 hours alert activity</p>
      </div>
    </div>
    <div class="text-right">
      <div class="text-2xl font-bold text-[#541A75]">{{ totalAlerts }}</div>
      <div class="text-xs text-[#7E7F9A]">Total Alerts</div>
    </div>
  </div>

  <div *ngIf="data && totalAlerts > 0" class="space-y-6">
    <!-- Main Chart Area -->
    <div class="space-y-3">
      <!-- Y-axis labels -->
      <div class="flex items-end gap-2 h-72">
        <!-- Y-Axis Labels -->
        <div class="flex flex-col justify-between text-xs text-[#7E7F9A] font-medium pr-2 h-full">
          <span>{{ maxCount }}</span>
          <span>{{ Math.floor(maxCount * 0.75) }}</span>
          <span>{{ Math.floor(maxCount * 0.5) }}</span>
          <span>{{ Math.floor(maxCount * 0.25) }}</span>
          <span>0</span>
        </div>

        <!-- Chart -->
        <div class="flex-1 flex items-end gap-1 h-full border-l-2 border-b-2 border-[#C0E0DE]/40 pl-3 pb-2 relative">
          <!-- Background grid lines -->
          <div class="absolute inset-0 flex flex-col justify-between pointer-events-none overflow-hidden rounded-sm">
            <div class="border-t border-[#C0E0DE]/10"></div>
            <div class="border-t border-[#C0E0DE]/10"></div>
            <div class="border-t border-[#C0E0DE]/10"></div>
            <div class="border-t border-[#C0E0DE]/10"></div>
          </div>

          <!-- Bars -->
          <div class="flex-1 flex items-end gap-0.5 relative z-10">
            <div *ngFor="let count of data.count; let i = index" 
              class="flex-1 group relative">
              
              <!-- Bar Container -->
              <div class="w-full flex items-end justify-center h-full">
                <div 
                  class="w-full rounded-t-lg transition-all duration-300 ease-out cursor-pointer group-hover:shadow-lg"
                  [ngClass]="{
                    'bg-gradient-to-t from-[#CB1527] via-[#E74C3C] to-[#E8A4A8]': count >= maxCount * 0.7,
                    'bg-gradient-to-t from-[#541A75] via-[#7E7F9A] to-[#B8A5C8]': count >= maxCount * 0.4 && count < maxCount * 0.7,
                    'bg-gradient-to-t from-[#00635D] via-[#20A591] to-[#C0E0DE]': count > 0 && count < maxCount * 0.4,
                    'bg-[#E8E8E8]': count === 0
                  }"
                  [style.minHeight.px]="count === 0 ? 2 : null"
                  [style.height.%]="count > 0 ? (count / maxCount) * 100 : 2"
                  [title]="count + ' alerts at ' + data.hours[i]">
                </div>
              </div>

              <!-- Hover Tooltip -->
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 whitespace-nowrap">
                <div class="bg-[#541A75] text-white text-xs font-semibold px-2 py-1 rounded shadow-lg">
                  {{ count }} <span class="text-[#C0E0DE]">{{ data.hours[i] }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- X-Axis Labels (Hours) -->
      <div class="flex gap-0.5 pl-12">
        <div *ngFor="let hour of data.hours; let i = index" 
          class="flex-1 text-center">
          <span class="text-xs text-[#7E7F9A] font-medium">
            {{ i % 3 === 0 ? hour : '' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Statistics Grid -->
    <div class="grid grid-cols-4 gap-3 mt-6">
      <!-- Total Alerts -->
      <div class="rounded-lg bg-gradient-to-br from-[#00635D]/5 to-[#C0E0DE]/10 p-3 border border-[#C0E0DE]/20">
        <div class="text-xs text-[#7E7F9A] font-semibold mb-1">Total</div>
        <div class="text-xl font-bold text-[#00635D]">{{ totalAlerts }}</div>
      </div>

      <!-- Peak Hour -->
      <div class="rounded-lg bg-gradient-to-br from-[#541A75]/5 to-[#7E7F9A]/10 p-3 border border-[#541A75]/20">
        <div class="text-xs text-[#7E7F9A] font-semibold mb-1">Peak Hour</div>
        <div class="text-xl font-bold text-[#541A75]">{{ peakHour }}</div>
      </div>

      <!-- Peak Count -->
      <div class="rounded-lg bg-gradient-to-br from-[#CB1527]/5 to-[#E8A4A8]/10 p-3 border border-[#CB1527]/20">
        <div class="text-xs text-[#7E7F9A] font-semibold mb-1">Peak Count</div>
        <div class="text-xl font-bold text-[#CB1527]">{{ maxCount }}</div>
      </div>

      <!-- Average -->
      <div class="rounded-lg bg-gradient-to-br from-[#20A591]/5 to-[#7FD4C8]/10 p-3 border border-[#20A591]/20">
        <div class="text-xs text-[#7E7F9A] font-semibold mb-1">Average</div>
        <div class="text-xl font-bold text-[#20A591]">{{ averageAlerts }}</div>
      </div>
    </div>

    <!-- Peak Activity Badge -->
    <div class="rounded-lg bg-gradient-to-r from-[#CB1527]/10 to-[#E8A4A8]/10 border border-[#CB1527]/30 p-4 flex items-center gap-3">
      <span class="text-2xl">🏃</span>
      <div>
        <div class="text-sm font-bold text-[#541A75]">Peak Activity</div>
        <div class="text-xs text-[#7E7F9A] mt-0.5">
          {{ maxCount }} alerts detected at <span class="font-semibold text-[#CB1527]">{{ peakHour }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div *ngIf="!data || totalAlerts === 0" class="h-72 flex flex-col items-center justify-center text-center">
    <div class="text-5xl mb-3">📭</div>
    <p class="font-semibold text-[#541A75] mb-1">No alert activity</p>
    <p class="text-sm text-[#7E7F9A]">No alerts in the last 24 hours</p>
  </div>
</div>
  `,
  styles: [`
    :host ::ng-deep {
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .group-hover\\:shadow-lg:hover {
        animation: slideUp 0.3s ease-out;
      }
    }
  `]
})
export class DailyEvolutionChartComponent implements OnChanges {
  @Input() data!: DailyData;
  Math = Math;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      console.log('[DailyEvolutionChart] Data updated:', {
        totalAlerts: this.totalAlerts,
        peakHour: this.peakHour,
        peakCount: this.actualMaxCount
      });
      // Force Angular to recalculate getters
      this.cdr.markForCheck();
    }
  }

  get maxCount(): number {
    if (!this.data?.count) return 10;
    const max = Math.max(...this.data.count, 1);
    // Round up to nearest nice number
    if (max <= 5) return 5;
    if (max <= 10) return 10;
    if (max <= 20) return 20;
    if (max <= 50) return 50;
    return Math.ceil(max / 10) * 10;
  }

  get actualMaxCount(): number {
    if (!this.data?.count) return 0;
    return Math.max(...this.data.count, 0);
  }

  get totalAlerts(): number {
    if (!this.data?.count) return 0;
    return this.data.count.reduce((sum, count) => sum + count, 0);
  }

  get averageAlerts(): number {
    if (!this.data?.count || this.totalAlerts === 0) return 0;
    const nonZeroHours = this.data.count.filter(c => c > 0).length;
    return nonZeroHours > 0 ? Math.round(this.totalAlerts / nonZeroHours) : 0;
  }

  get peakHour(): string {
    if (!this.data?.count || !this.data?.hours) return '-';
    const actualMax = this.actualMaxCount;
    const maxIndex = this.data.count.indexOf(actualMax);
    return maxIndex >= 0 ? this.data.hours[maxIndex] : '-';
  }
}
