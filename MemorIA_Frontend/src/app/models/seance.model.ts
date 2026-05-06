import { Activite } from './activite.model';

export enum StatutSeance {
  DISPONIBLE = 'DISPONIBLE',
  RESERVE = 'RESERVE',
  ANNULE = 'ANNULE'
}

export interface Seance {
  id?: number;
  activite?: Activite;
  date: string; // LocalDate (YYYY-MM-DD)
  heureDebut: string; // LocalTime (HH:mm:ss)
  heureFin: string;
  statut?: StatutSeance;
}
