import { Component, input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-metric-card',
    standalone: true,
    imports: [CommonModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './metric-card.component.html',
    styleUrl: './metric-card.component.css'
})
export class MetricCardComponent {
    title = input.required<string>();
    value = input.required<string | number>();
    subtitle = input.required<string>();
    trend = input<string>();
    icon = input.required<any>();
    color = input.required<'blue' | 'green' | 'orange' | 'red'>();
}
