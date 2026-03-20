export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}
