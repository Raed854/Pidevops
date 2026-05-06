import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Calendar, FileText, Activity, AlertCircle, Pill } from 'lucide-angular';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule
  ],
  templateUrl: './patient-detail.component.html',
  styleUrl: './patient-detail.component.css'
})
export class PatientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);

  readonly icons = {
    ArrowLeft,
    Calendar,
    FileText,
    Activity,
    AlertCircle,
    Pill
  };

  patientId: string | null = null;

  // Mock patient data
  patient = {
    id: '1',
    name: 'Marie Dubois',
    age: 72,
    dateOfBirth: '1952-05-15',
    photo: null,
    lastTest: '2024-02-01',
    mmseScore: 24,
    status: 'surveillance',
    medications: [
      { name: 'Donépézil', dosage: '10mg', frequency: '1x/jour' },
      { name: 'Mémantine', dosage: '20mg', frequency: '1x/jour' }
    ],
    history: [
      { date: '2024-02-01', test: 'MMSE', score: 24, notes: 'Légère baisse' },
      { date: '2024-01-01', test: 'MMSE', score: 26, notes: 'Stable' },
      { date: '2023-12-01', test: 'MMSE', score: 26, notes: 'Premier test' }
    ],
    alerts: [
      { type: 'warning', message: 'Baisse de score de 2 points en 1 mois', date: '2024-02-01' }
    ]
  };

  ngOnInit() {
    this.patientId = this.route.snapshot.paramMap.get('id');
    // In a real app, fetch data based on ID
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('');
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }
}
