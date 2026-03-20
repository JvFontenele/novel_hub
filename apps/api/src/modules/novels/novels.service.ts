import * as novelsRepo from './novels.repository.js';
import { enqueueCollect } from '../../queue/producer.js';
import { normalizeSourceUrl, resolveConnectorKey } from '@novel-hub/scraping';

export async function registerNovel(userId: string, sourceUrl: string, displayName: string) {
  const novel = await novelsRepo.createNovel(displayName);
  const normalizedUrl = normalizeSourceUrl(sourceUrl);
  const connectorKey = resolveConnectorKey(normalizedUrl);
  const source = await novelsRepo.createSource(novel.id, normalizedUrl, connectorKey);
  await novelsRepo.createSubscription(userId, novel.id);
  await enqueueCollect(source.id);

  return {
    novelId: novel.id,
    sourceId: source.id,
    status: source.status,
  };
}
