import * as sourcesRepo from './sources.repository.js';
import { enqueueCollect } from '../../queue/producer.js';

export async function toggleMonitoring(sourceId: string, monitoringEnabled: boolean) {
  return sourcesRepo.updateSourceMonitoring(sourceId, monitoringEnabled);
}

export async function triggerCollection(sourceId: string, userId: string) {
  const source = await sourcesRepo.findSourceByIdForUser(sourceId, userId);
  if (!source) {
    return null;
  }

  await enqueueCollect(sourceId, {
    jobId: `${sourceId}:manual:${Date.now()}`,
  });

  return {
    queued: true as const,
    sourceId,
  };
}
