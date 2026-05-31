import * as sourcesRepo from './sources.repository.js';
import { enqueueCollect } from '../../queue/producer.js';

export async function toggleMonitoring(sourceId: string, monitoringEnabled: boolean) {
  return sourcesRepo.updateSourceMonitoring(sourceId, monitoringEnabled);
}

export async function triggerCollection(sourceId: string, adminUserId: string) {
  const source = await sourcesRepo.findSourceById(sourceId);
  if (!source) {
    return null;
  }

  await enqueueCollect(sourceId, {
    jobId: `${sourceId}-manual-${Date.now()}`,
    requestedByUserId: adminUserId,
  });

  return {
    queued: true as const,
    sourceId,
  };
}
