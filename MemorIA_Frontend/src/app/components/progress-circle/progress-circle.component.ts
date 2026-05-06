import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-progress-circle',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './progress-circle.component.html',
    styleUrl: './progress-circle.component.css'
})
export class ProgressCircleComponent {
    percentage = input.required<number>();
    label = input.required<string>();
    size = input(180);

    // Computed properties
    strokeWidth = 12;

    radius = computed(() => (this.size() - this.strokeWidth) / 2);
    circumference = computed(() => 2 * Math.PI * this.radius());
    offset = computed(() => this.circumference() - (this.percentage() / 100) * this.circumference());

    transform = computed(() => `rotate(-90 ${this.size() / 2} ${this.size() / 2})`);

    color = computed(() => {
        const p = this.percentage();
        if (p >= 70) return 'var(--success)';
        if (p >= 40) return 'var(--warning)';
        return 'var(--accent)';
    });
}
