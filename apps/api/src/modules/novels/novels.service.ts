import { sql } from '../../db/client.js';
import { enqueueCollect } from '../../queue/producer.js';
import { normalizeSourceUrl, resolveConnectorKey } from '@novel-hub/scraping';

export async function registerNovel(adminId: string, sourceUrl: string, displayName: string) {
  const normalizedUrl = normalizeSourceUrl(sourceUrl);
  const connectorKey = resolveConnectorKey(normalizedUrl);

  const { novel, source } = await sql.begin(async (tx) => {
    const [novel] = await tx`
      INSERT INTO novels (title)
      VALUES (${displayName})
      RETURNING id, title, status
    `;
    const [source] = await tx`
      INSERT INTO novel_sources (novel_id, url, connector_key, next_check_at)
      VALUES (${novel.id}, ${normalizedUrl}, ${connectorKey}, NOW())
      RETURNING id, status
    `;
    return { novel, source };
  });

  await enqueueCollect(source.id, { requestedByUserId: adminId });

  return {
    novelId: novel.id,
    sourceId: source.id,
    status: source.status,
  };
}
