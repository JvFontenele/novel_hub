import { api } from './client'
import { mockAdminApi } from './mock'
import type { CollectorRun, SourceFailure } from '@/types'

const IS_MOCK = import.meta.env.VITE_MOCK_API === 'true'

export const adminApi = {
  collectorRuns: (): Promise<CollectorRun[]> =>
    IS_MOCK
      ? mockAdminApi.collectorRuns()
      : api.get<{ items: CollectorRun[] }>('/admin/collector-runs').then((r) => r.data.items),

  sourceFailures: (): Promise<SourceFailure[]> =>
    IS_MOCK
      ? mockAdminApi.sourceFailures()
      : api.get<{ items: SourceFailure[] }>('/admin/source-failures').then((r) => r.data.items),
}
