import * as sourcesRepo from './sources.repository.js';

export async function toggleMonitoring(sourceId: string, monitoringEnabled: boolean) {
  return sourcesRepo.updateSourceMonitoring(sourceId, monitoringEnabled);
}
