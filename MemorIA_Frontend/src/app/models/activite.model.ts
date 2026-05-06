import { Seance } from './seance.model';

export interface Activite {
  id?: number;
  titre: string;
  description: string;
  image: string;
  type: string;
  doctor?: { id: number; nom?: string; prenom?: string }; // Structure nidifiée 'normale'
}
