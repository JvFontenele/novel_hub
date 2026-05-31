export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
}
