import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';

export interface TopAlertType {
  type: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-top-alert-types-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#C0E0DE]/40">
  <div class="flex items-center gap-2 mb-4">
    <span class="text-lg">📈</span>
    <h3 class="font-semibold text-[#541A75]">Top 3 Alert Types</h3>
  </div>

  <div class="space-y-4">
    <div *ngFor="let alert of data; let i = index" class="flex items-end gap-3">
      <!-- Label + Count -->
      <div class="w-24">
        <p class="text-sm font-semibold text-[#541A75]">{{ i + 1 }}. {{ alert.type }}</p>
        <p class="text-xs text-[#7E7F9A]">{{ alert.count }} alerts</p>
      </div>

      <!-- Bar Chart -->
      <div class="flex-1 h-8 bg-[#C0E0DE]/20 rounded-lg overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-[#541A75] to-[#7E7F9A] transition-all duration-500"
          [style.width.%]="alert.percentage"
          [style.background]="getGradientForIndex(i)">
        </div>
      </div>

      <!-- Percentage -->
      <div class="w-12 text-right">
        <p class="text-sm font-bold text-[#541A75]">{{ alert.percentage }}%</p>
      </div>
    </div>
  </div>
</div>
  `
})
export class TopAlertTypesChartComponent {
  @Input() data: TopAlertType[] = [];

  getGradientForIndex(index: number): string {
    const gradients = [
      'linear-gradient(to right, #CB1527, #F59E0B)',    // Red to Orange
      'linear-gradient(to right, #541A75, #7E7F9A)',    // Purple to Gray
      'linear-gradient(to right, #C0E0DE, #00635D)'     // Teal to Green
    ];
    return gradients[index % gradients.length];
  }
}
