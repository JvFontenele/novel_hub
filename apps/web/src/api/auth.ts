import { api } from './client'
import { mockAuth } from './mock'
import type { AuthResponse } from '@/types'

const IS_MOCK = import.meta.env.VITE_MOCK_API === 'true'

export const authApi = {
  register: (data: { name: string; email: string; password: string }): Promise<AuthResponse> =>
    IS_MOCK
      ? mockAuth.register(data)
      : api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }): Promise<AuthResponse> =>
    IS_MOCK
      ? mockAuth.login(data)
      : api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
}
