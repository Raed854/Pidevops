import { Seance } from './seance.model';

export enum StatutReservation {
  EN_ATTENTE = 'EN_ATTENTE',
  ACCEPTEE = 'ACCEPTEE',
  REFUSEE = 'REFUSEE',
  ANNULEE = 'ANNULEE',
  TERMINEE_PRESENTE = 'TERMINEE_PRESENTE',
  TERMINEE_ABSENTE = 'TERMINEE_ABSENTE'
}

export interface Reservation {
  id?: number;
  seance?: Seance;
  accompagnant?: any; // User
  statut: StatutReservation | string;
  dateReservation: string;
}
