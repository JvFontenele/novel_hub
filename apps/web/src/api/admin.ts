import { api } from './client'
import type {
  CollectorRunView,
  ScraperSettingView,
  SourceFailureView,
  UpsertScraperSettingInput,
} from '@novel-hub/contracts'

export const adminApi = {
  collectorRuns: (): Promise<CollectorRunView[]> =>
    api.get<{ items: CollectorRunView[] }>('/admin/collector-runs').then((r) => r.data.items),

  sourceFailures: (): Promise<SourceFailureView[]> =>
    api.get<{ items: SourceFailureView[] }>('/admin/source-failures').then((r) => r.data.items),

  scraperSettings: (): Promise<ScraperSettingView[]> =>
    api.get<{ items: ScraperSettingView[] }>('/admin/scraper-settings').then((r) => r.data.items),

  saveScraperSetting: (data: UpsertScraperSettingInput): Promise<ScraperSettingView> =>
    api.put<ScraperSettingView>('/admin/scraper-settings', data).then((r) => r.data),
}
