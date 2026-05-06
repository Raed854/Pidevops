import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Patient } from '../../../../models/patient.model';

@Component({
  selector: 'app-patient-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-selector.component.html',
  styleUrls: ['./patient-selector.component.css']
})
export class PatientSelectorComponent implements OnInit {

  @Input() patients: Patient[] = [];
  @Input() selectedPatient: Patient | null = null;
  @Output() patientSelected = new EventEmitter<Patient>();

  searchTerm: string = '';
  filteredPatients: Patient[] = [];
  isSearchFocused: boolean = false;

  ngOnInit(): void {
    this.filteredPatients = this.patients;
  }

  ngOnChanges(): void {
    this.updateFilteredPatients();
  }

  /**
   * Filtre la liste des patients selon la recherche
   */
  onSearchChange(): void {
    this.updateFilteredPatients();
  }

  /**
   * Sélectionne un patient
   */
  selectPatient(patient: Patient): void {
    this.patientSelected.emit(patient);
    this.searchTerm = '';
    this.filteredPatients = this.patients;
  }

  /**
   * Obtient les initiales d'un patient
   */
  getInitials(patient: Patient): string {
    return patient.initials || `${patient.prenom[0]}${patient.nom[0]}`.toUpperCase();
  }

  /**
   * Obtient la couleur du badge stage
   */
  getStageColor(stage: string): string {
    const colors: Record<string, string> = {
      'LEGER': '#C0E0DE', // Vert clair
      'MODERE': '#FFC107', // Jaune
      'AVANCE': '#CB1527'  // Rouge
    };
    return colors[stage] || '#7E7F9A';
  }

  /**
   * Obtient le label du stage
   */
  getStageLabel(stage: string): string {
    const labels: Record<string, string> = {
      'LEGER': 'Léger',
      'MODERE': 'Modéré',
      'AVANCE': 'Avancé'
    };
    return labels[stage] || stage;
  }

  /**
   * Formate la date du prochain RDV
   */
  formatNextAppointment(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * TrackBy pour ngFor performance
   */
  trackByPatientId(index: number, patient: Patient): number {
    return patient.id;
  }

  // ===== MÉTHODES PRIVÉES =====

  private updateFilteredPatients(): void {
    if (!this.searchTerm.trim()) {
      this.filteredPatients = this.patients;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredPatients = this.patients.filter(p =>
        p.nom.toLowerCase().includes(term) ||
        p.prenom.toLowerCase().includes(term) ||
        p.age.toString().includes(term)
      );
    }
  }
}
