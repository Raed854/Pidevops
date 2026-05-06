/** Enums matching backend (send as string). */
export type Sexe = 'M' | 'F' | 'Autre';
export type GroupeSanguin = 'A_pos' | 'A_neg' | 'B_pos' | 'B_neg' | 'AB_pos' | 'AB_neg' | 'O_pos' | 'O_neg';
export type LienPatient = 'familial' | 'professionnel';
export type SituationPro = 'salarie' | 'retraite' | 'sans_activite';
export type FrequenceAccompagnement = 'quotidien' | 'hebdo' | 'mensuel';

export interface PatientSignupData {
  dateNaissance: string; // ISO date YYYY-MM-DD
  sexe: Sexe;
  numeroSecuriteSociale: string;
  adresse?: string;
  ville?: string;
  groupeSanguin?: GroupeSanguin;
  mutuelle?: string;
  numeroPoliceMutuelle?: string;
}

export interface AccompagnantSignupData {
  lienPatient: LienPatient;
  dateNaissance: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  telephoneSecours?: string;
  situationPro?: SituationPro;
  frequenceAccompagnement: FrequenceAccompagnement;
}

export interface SoignantSignupData {
  numeroOrdre: string;
  specialite: string;
  hopital: string;
  numeroTelephone2?: string;
  diplomes?: string;
  anneesExperience?: number;
  biographie?: string;
  dateDebutExercice?: string; // ISO date
}

export interface SignupRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: 'PATIENT' | 'SOIGNANT' | 'ACCOMPAGNANT';
  password: string;
}
