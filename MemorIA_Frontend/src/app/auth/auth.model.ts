export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  actif: boolean;
  profileCompleted: boolean;
}
