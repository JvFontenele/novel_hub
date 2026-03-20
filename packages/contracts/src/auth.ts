export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
}
