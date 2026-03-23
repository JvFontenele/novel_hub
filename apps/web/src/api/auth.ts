import { api } from './client'
import type { AuthResponse } from '@novel-hub/contracts'

export const authApi = {
  register: (data: { name: string; email: string; password: string }): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
}
