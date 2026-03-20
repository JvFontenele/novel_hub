import type { User, AuthResponse, Novel, NovelDetail, PaginatedResponse, Chapter, NovelEvent, Notification, CollectorRun, SourceFailure } from '@/types'
import {
  MOCK_NOVELS,
  MOCK_DETAIL,
  MOCK_CHAPTERS,
  MOCK_EVENTS,
  MOCK_NOTIFICATIONS,
  MOCK_COLLECTOR_RUNS,
  MOCK_SOURCE_FAILURES,
} from './data'

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

// In-memory state for mock session
let mockNovels = [...MOCK_NOVELS]
let mockNotifications = [...MOCK_NOTIFICATIONS]

function getUsers(): Array<User & { password: string }> {
  try {
    return JSON.parse(localStorage.getItem('__mock_users__') ?? '[]')
  } catch {
    return []
  }
}

function saveUsers(users: Array<User & { password: string }>) {
  localStorage.setItem('__mock_users__', JSON.stringify(users))
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export const mockAuth = {
  async register(data: { name: string; email: string; password: string }): Promise<AuthResponse> {
    await delay()
    const users = getUsers()
    if (users.find((u) => u.email === data.email)) {
      throw Object.assign(new Error('Email já cadastrado'), { response: { status: 409 } })
    }
    const user: User = { id: makeId('usr'), name: data.name, email: data.email }
    saveUsers([...users, { ...user, password: data.password }])
    return { user, token: `mock_token_${user.id}` }
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    await delay()
    const users = getUsers()
    const found = users.find((u) => u.email === data.email && u.password === data.password)
    if (!found) throw Object.assign(new Error('Credenciais inválidas'), { response: { status: 401 } })
    const { password: _p, ...user } = found
    return { user, token: `mock_token_${user.id}` }
  },
}

export const mockNovelsApi = {
  async list(): Promise<Novel[]> {
    await delay(300)
    return [...mockNovels]
  },

  async get(_novelId: string): Promise<NovelDetail> {
    await delay(300)
    const novel = mockNovels.find((n) => n.novelId === _novelId)
    if (!novel) return MOCK_DETAIL
    return { ...MOCK_DETAIL, ...novel }
  },

  async create(data: { sourceUrl: string; displayName: string }) {
    await delay(600)
    const newNovel: Novel = {
      novelId: makeId('nov'),
      title: data.displayName,
      status: 'ONGOING',
      lastChapterNumber: 0,
      lastReadChapterNumber: 0,
    }
    mockNovels = [newNovel, ...mockNovels]
    return { novelId: newNovel.novelId, sourceId: makeId('src'), status: 'MONITORING' }
  },

  async updateProgress(novelId: string, lastReadChapterNumber: number) {
    await delay(200)
    mockNovels = mockNovels.map((n) =>
      n.novelId === novelId ? { ...n, lastReadChapterNumber } : n,
    )
    return { novelId, lastReadChapterNumber }
  },

  async chapters(_novelId: string): Promise<PaginatedResponse<Chapter>> {
    await delay(300)
    return { items: MOCK_CHAPTERS, total: MOCK_CHAPTERS.length }
  },

  async events(_novelId: string): Promise<NovelEvent[]> {
    await delay(300)
    return MOCK_EVENTS
  },

  async toggleSource(sourceId: string, monitoringEnabled: boolean) {
    await delay(200)
    return { sourceId, monitoringEnabled }
  },
}

export const mockNotificationsApi = {
  async list(): Promise<Notification[]> {
    await delay(200)
    return [...mockNotifications]
  },

  async markRead(id: string): Promise<void> {
    await delay(150)
    mockNotifications = mockNotifications.map((n) => (n.id === id ? { ...n, read: true } : n))
  },
}

export const mockAdminApi = {
  async collectorRuns(): Promise<CollectorRun[]> {
    await delay(300)
    return MOCK_COLLECTOR_RUNS
  },

  async sourceFailures(): Promise<SourceFailure[]> {
    await delay(300)
    return MOCK_SOURCE_FAILURES
  },
}
