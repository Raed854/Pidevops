import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Patient } from '../../../../models/patient.model';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.css']
})
export class PatientListComponent {

  @Input() patients: Patient[] = [];
  @Input() selectedPatient: Patient | null = null;

  @Output() patientSelected = new EventEmitter<Patient>();

  searchTerm: string = '';

  get filteredPatients(): Patient[] {
    if (!this.searchTerm.trim()) {
      return this.patients;
    }
    const term = this.searchTerm.toLowerCase();
    return this.patients.filter(p =>
      p.nom.toLowerCase().includes(term) ||
      p.prenom.toLowerCase().includes(term)
    );
  }

  onSelectPatient(patient: Patient): void {
    this.patientSelected.emit(patient);
  }

  getStageClass(stage: string): string {
    const classes: { [key: string]: string } = {
      'LEGER': 'stage-leger',
      'MODERE': 'stage-modere',
      'AVANCE': 'stage-avance'
    };
    return classes[stage] || '';
  }

  getStageLabel(stage: string): string {
    const labels: { [key: string]: string } = {
      'LEGER': 'Léger',
      'MODERE': 'Modéré',
      'AVANCE': 'Avancé'
    };
    return labels[stage] || stage;
  }

  getAdherenceColor(rate: number): string {
    if (rate >= 80) return '#00635D';
    if (rate >= 60) return '#F59E0B';
    return '#CB1527';
  }
}
