import { Component } from '@angular/core';
import { AlertesComponent } from '../alertes.component';

@Component({
  selector: 'app-patient-alertes',
  standalone: true,
  imports: [AlertesComponent],
  templateUrl: '../templates/patient-alertes-component/patient-alertes.component.html',
  styleUrls: ['../templates/patient-alertes-component/patient-alertes.component.scss']
})
export class PatientAlertesComponent {}
