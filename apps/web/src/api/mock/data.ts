import type { Novel, NovelDetail, Chapter, NovelEvent, Notification, CollectorRun, SourceFailure } from '@/types'

export const MOCK_NOVELS: Novel[] = [
  {
    novelId: 'nov_001',
    title: 'Solo Leveling',
    coverUrl: 'https://m.media-amazon.com/images/I/81L3C1Gk3fL._SL1500_.jpg',
    status: 'COMPLETED',
    lastChapterNumber: 179,
    lastReadChapterNumber: 132,
  },
  {
    novelId: 'nov_002',
    title: 'The Beginning After The End',
    coverUrl: 'https://m.media-amazon.com/images/I/71f5FUXj8AL._SL1200_.jpg',
    status: 'ONGOING',
    lastChapterNumber: 490,
    lastReadChapterNumber: 490,
  },
  {
    novelId: 'nov_003',
    title: 'Omniscient Reader\'s Viewpoint',
    coverUrl: '',
    status: 'COMPLETED',
    lastChapterNumber: 551,
    lastReadChapterNumber: 0,
  },
]

export const MOCK_DETAIL: NovelDetail = {
  ...MOCK_NOVELS[0],
  sources: [
    {
      sourceId: 'src_001',
      url: 'https://www.novelupdates.com/series/solo-leveling/',
      monitoringEnabled: true,
      lastFetchedAt: new Date(Date.now() - 3600_000).toISOString(),
    },
  ],
}

export const MOCK_CHAPTERS: Chapter[] = Array.from({ length: 20 }, (_, i) => ({
  chapterId: `ch_${i + 1}`,
  number: i + 1,
  title: i % 5 === 0 ? `The Awakening — Part ${i + 1}` : undefined,
  url: '#',
  publishedAt: new Date(Date.now() - (20 - i) * 86_400_000).toISOString(),
}))

export const MOCK_EVENTS: NovelEvent[] = [
  {
    eventId: 'ev_001',
    type: 'NEW_CHAPTER',
    payload: { chapterNumber: 179 },
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    eventId: 'ev_002',
    type: 'STATUS_CHANGE',
    payload: { from: 'ONGOING', to: 'COMPLETED' },
    createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  },
]

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'ntf_001',
    type: 'NEW_CHAPTER',
    novelId: 'nov_001',
    title: 'Solo Leveling — Cap. 179 disponível',
    read: false,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 'ntf_002',
    type: 'NEW_CHAPTER',
    novelId: 'nov_002',
    title: 'The Beginning After The End — Cap. 490 disponível',
    read: false,
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
  },
  {
    id: 'ntf_003',
    type: 'NEW_CHAPTER',
    novelId: 'nov_001',
    title: 'Solo Leveling — Cap. 178 disponível',
    read: true,
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
]

export const MOCK_COLLECTOR_RUNS: CollectorRun[] = [
  {
    id: 'run_001',
    sourceId: 'src_001',
    sourceUrl: 'https://www.novelupdates.com/series/solo-leveling/',
    status: 'SUCCESS',
    chaptersFound: 1,
    durationMs: 843,
    ranAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 'run_002',
    sourceId: 'src_002',
    sourceUrl: 'https://www.scribblehub.com/series/tbate/',
    status: 'FAILURE',
    chaptersFound: 0,
    durationMs: 5001,
    ranAt: new Date(Date.now() - 7200_000).toISOString(),
    error: 'Timeout after 5000ms',
  },
  {
    id: 'run_003',
    sourceId: 'src_001',
    sourceUrl: 'https://www.novelupdates.com/series/solo-leveling/',
    status: 'SUCCESS',
    chaptersFound: 0,
    durationMs: 412,
    ranAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
]

export const MOCK_SOURCE_FAILURES: SourceFailure[] = [
  {
    sourceId: 'src_002',
    sourceUrl: 'https://www.scribblehub.com/series/tbate/',
    novelTitle: 'The Beginning After The End',
    failureCount: 3,
    lastFailureAt: new Date(Date.now() - 7200_000).toISOString(),
    lastError: 'Timeout after 5000ms — host may be rate-limiting',
  },
]
