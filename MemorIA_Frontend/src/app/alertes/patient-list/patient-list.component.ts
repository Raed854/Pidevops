import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.css']
})
export class PatientListComponent implements OnInit {
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  loading: boolean = true;
  error: string | null = null;
  searchTerm: string = '';

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    this.error = null;
    
    // TODO: Implement patient loading once backend API is ready
    // For now, initialize with empty patients list
    this.patients = [];
    this.filteredPatients = [];
    this.loading = false;
  }

  onSearchChange(): void {
    if (!this.searchTerm.trim()) {
      this.filteredPatients = this.patients;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredPatients = this.patients.filter(p =>
        p.nom.toLowerCase().includes(term) ||
        p.prenom.toLowerCase().includes(term)
      );
    }
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
    if (rate >= 80) return '#4CAF50';
    if (rate >= 60) return '#FFC107';
    if (rate >= 40) return '#FF9800';
    return '#F44336';
  }
}
