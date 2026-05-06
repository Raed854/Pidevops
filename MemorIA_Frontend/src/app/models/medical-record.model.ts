export type StadeMaladie = 'LEGER' | 'MODERE' | 'SEVERE';
export type Orientation = 'CONSCIENT' | 'CONFUS';
export type NiveauFonctionnement = 'INDEPENDANT' | 'BESOIN_AIDE' | 'DEPENDANT';
export type EtatComportement = 'CALME' | 'ANXIEUX' | 'AGRESSIF' | 'FUGUE';

export interface PatientRef {
  id: number;
}

export interface DossierMedical {
  id?: number;
  patient: PatientRef;

  // 1. Basic Information
  contactPatient?: string;

  // 2. Diagnosis
  typeDiagnostic?: string;
  stade?: StadeMaladie;
  dateDiagnostic?: string; // ISO date string

  // 3. Health & History
  maladiesPrincipales?: string;
  allergies?: string;

  // 4. Cognitive State
  niveauMemoire?: string;
  orientation?: Orientation;

  // 5. Daily Function
  niveauFonctionnement?: NiveauFonctionnement;

  // 6. Medications
  medicamentsActuels?: string;

  // 7. Behavior
  etatComportement?: EtatComportement;

  // 8. Caregiver
  accompagnantNom?: string;
  accompagnantContact?: string;

  // 9. Notes & Follow-up
  notesMedecin?: string;
  derniereVisite?: string; // ISO date string

  // Audit
  dateCreation?: string;
  dateModification?: string;
}

export interface DossierMedicalRequest extends Omit<DossierMedical, 'id' | 'dateCreation' | 'dateModification'> {}
