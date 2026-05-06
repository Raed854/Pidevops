export enum TypeAbonnement {
  PACK_4 = 'PACK_4',
  PACK_15 = 'PACK_15',
  PACK_50 = 'PACK_50'
}

export enum StatutAbonnement {
  ACTIF = 'ACTIF',
  TERMINE = 'TERMINE'
}

export interface Abonnement {
  id?: number;
  accompagnant?: any; // User
  type: TypeAbonnement;
  seancesRestantes: number;
  statut: StatutAbonnement;
  dateDebut: string;
  dateFin: string;
  seancesTotal: number;
  stripePaymentIntentId?: string;
}
