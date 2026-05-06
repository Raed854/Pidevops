import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface DailySummary {
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-daily-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="rounded-2xl bg-gradient-to-br from-[#541A75]/5 to-[#C0E0DE]/20 border border-[#C0E0DE]/40 p-6">
  <div class="flex items-start gap-3">
    <span class="text-2xl shrink-0">🤖</span>
    
    <div class="flex-1">
      <h3 class="font-semibold text-[#541A75] mb-2">AI Daily Summary</h3>
      
      <p class="text-sm text-[#541A75]/80 leading-relaxed mb-3">
        {{ summary?.text || 'Analysis in progress...' }}
      </p>

      <p class="text-xs text-[#7E7F9A]">
        Updated: {{ getUpdateTime() }}
      </p>
    </div>
  </div>
</div>
  `
})
export class DailySummaryComponent {
  @Input() summary!: DailySummary | null;

  getUpdateTime(): string {
    if (!this.summary) return 'N/A';
    
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - this.summary.timestamp.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    return `${Math.floor(diffHours / 24)}d`;
  }
}
