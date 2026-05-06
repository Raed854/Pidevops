import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Patient } from '../../../../models/patient.model';
import { AdherenceMetrics } from '../../../../models/doctor-planning.model';

@Component({
  selector: 'app-stats-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-panel.component.html',
  styleUrls: ['./stats-panel.component.css']
})
export class StatsPanelComponent {

  @Input() metrics!: AdherenceMetrics;
  @Input() patient!: Patient;

  /**
   * Obtient la couleur pour un taux d'observance
   */
  getObservanceColor(rate: number): string {
    if (rate >= 80) return '#00635D'; // Vert foncé
    if (rate >= 50) return '#FFC107'; // Jaune
    return '#CB1527'; // Rouge
  }

  /**
   * Gets the status of the adherence rate
   */
  getObservanceStatus(rate: number): string {
    if (rate >= 80) return 'Excellent';
    if (rate >= 60) return 'Good';
    if (rate >= 40) return 'Average';
    return 'Needs Improvement';
  }

  /**
   * Obtient l'icône pour un status
   */
  getStatusIcon(rate: number): string {
    if (rate >= 80) return 'fas fa-star';
    if (rate >= 60) return 'fas fa-smile';
    if (rate >= 40) return 'fas fa-exclamation-triangle';
    return 'fas fa-frown';
  }

  /**
   * Formate un pourcentage
   */
  formatRate(rate: number): string {
    return Math.round(rate) + '%';
  }

  /**
   * TrackBy pour ngFor
   */
  trackByType(index: number, category: any): string {
    return category.type;
  }

  /**
   * Obtient la couleur pour un type de rappel
   */
  getCategoryColor(type: string): string {
    const colors: { [key: string]: string } = {
      'MEDICATION': '#00635D',
      'MEDICAL_APPOINTMENT': '#541A75',
      'HYDRATION': '#C0E0DE',
      'COGNITIVE_TEST': '#7E7F9A',
      'HYGIENE': '#FFC107'
    };
    return colors[type] || '#7E7F9A';
  }

  /**
   * Obtient l'icône pour un type de rappel
   */
  getCategoryIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'MEDICATION': 'fas fa-pills',
      'MEDICAL_APPOINTMENT': 'fas fa-calendar-check',
      'HYDRATION': 'fas fa-water',
      'COGNITIVE_TEST': 'fas fa-brain',
      'HYGIENE': 'fas fa-shower'
    };
    return icons[type] || 'fas fa-clipboard';
  }

  /**
   * Gets the label for a reminder type
   */
  getCategoryLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'MEDICATION': 'Medications',
      'MEDICAL_APPOINTMENT': 'Appointments',
      'HYDRATION': 'Hydration',
      'COGNITIVE_TEST': 'Cognitive',
      'HYGIENE': 'Hygiene'
    };
    return labels[type] || type;
  }

  /**
   * Obtient la classe CSS pour le badge de statut
   */
  getStatusClass(rate: number): string {
    if (rate >= 80) return 'status-badge status-good';
    if (rate >= 50) return 'status-badge status-medium';
    return 'status-badge status-bad';
  }

  /**
   * Formate une date
   */
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  }
}
