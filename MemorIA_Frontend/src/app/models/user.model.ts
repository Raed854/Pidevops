export interface UserPayload {
  nom: string;
  prenom: string;
  telephone: string;
  role: string;
  actif: boolean;
  profileCompleted: boolean;
  email: string;
  password?: string;
}

export interface UserResponse extends Omit<UserPayload, 'password'> {
  id: number;
}
