import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface WeeklyData {
  weeks: string[];
  count: number[];
}

@Component({
  selector: 'app-weekly-evolution-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#C0E0DE]/40">
  <div class="flex items-center gap-2 mb-6">
    <span class="text-lg">📊</span>
    <h3 class="font-semibold text-[#541A75]">Weekly Evolution</h3>
  </div>

  <div *ngIf="data" class="space-y-4">
    <!-- Chart -->
    <div class="h-64 flex items-end gap-1">
      <div *ngFor="let count of data.count; let i = index" 
        class="flex-1 flex flex-col items-center gap-2">
        
        <!-- Bar -->
        <div class="w-full flex items-end justify-center">
          <div 
            class="w-full rounded-t-lg bg-gradient-to-t from-[#541A75] to-[#7E7F9A] transition-all hover:opacity-80"
            [style.height.%]="(count / maxCount) * 100"
            [class.min-h-8]="count > 0"
            [title]="count + ' alerts'">
          </div>
        </div>

        <!-- Label -->
        <div class="text-xs text-[#7E7F9A] font-medium w-full text-center truncate">
          {{ data.weeks[i] }}
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center justify-between text-xs text-[#7E7F9A] border-t border-[#C0E0DE]/20 pt-3">
      <span>Last 8 weeks</span>
      <span>Max: {{ maxCount }} alerts</span>
    </div>
  </div>

  <!-- Empty State -->
  <div *ngIf="!data" class="h-64 flex items-center justify-center">
    <p class="text-[#7E7F9A] text-sm">Chart data unavailable</p>
  </div>
</div>
  `
})
export class WeeklyEvolutionChartComponent {
  @Input() data!: WeeklyData;

  get maxCount(): number {
    if (!this.data?.count) return 10;
    return Math.max(...this.data.count, 1);
  }
}

