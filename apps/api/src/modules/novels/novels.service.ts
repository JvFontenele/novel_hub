import * as novelsRepo from './novels.repository.js';
import { enqueueCollect } from '../../queue/producer.js';

function resolveConnectorKey(url: string): string {
  try {
    const { hostname } = new URL(url);
    if (hostname.includes('royalroad.com')) return 'royalroad';
    return 'generic';
  } catch {
    return 'generic';
  }
}

export async function registerNovel(userId: string, sourceUrl: string, displayName: string) {
  const novel = await novelsRepo.createNovel(displayName);
  const connectorKey = resolveConnectorKey(sourceUrl);
  const source = await novelsRepo.createSource(novel.id, sourceUrl, connectorKey);
  await novelsRepo.createSubscription(userId, novel.id);
  await enqueueCollect(source.id);

  return {
    novelId: novel.id,
    sourceId: source.id,
    status: source.status,
  };
}
