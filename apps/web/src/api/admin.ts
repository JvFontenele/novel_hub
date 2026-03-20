import { api } from './client'
import type { CollectorRunView, SourceFailureView } from '@novel-hub/contracts'

export const adminApi = {
  collectorRuns: (): Promise<CollectorRunView[]> =>
    api.get<{ items: CollectorRunView[] }>('/admin/collector-runs').then((r) => r.data.items),

  sourceFailures: (): Promise<SourceFailureView[]> =>
    api.get<{ items: SourceFailureView[] }>('/admin/source-failures').then((r) => r.data.items),
}
