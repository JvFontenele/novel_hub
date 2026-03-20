import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const allowedHosts = new Set([
  'book-pic.webnovel.com',
  'cc-cdnintserviceimg.webnovel.com',
  'webbanner.webnovel.com',
]);

const proxyCoverSchema = z.object({
  url: z.string().url(),
});

function isAllowedCoverUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && allowedHosts.has(parsed.hostname);
  } catch {
    return false;
  }
}

export async function assetsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { url?: string } }>(
    '/assets/cover',
    async (request, reply) => {
      const query = proxyCoverSchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ message: 'Invalid cover URL' });
      }

      const { url } = query.data;
      if (!isAllowedCoverUrl(url)) {
        return reply.code(403).send({ message: 'Cover host not allowed' });
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          Referer: 'https://www.webnovel.com/',
        },
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        return reply.code(response.status).send({ message: 'Unable to fetch cover image' });
      }

      const contentType = response.headers.get('content-type') ?? 'image/jpeg';
      const cacheControl = response.headers.get('cache-control') ?? 'public, max-age=86400';
      const bytes = Buffer.from(await response.arrayBuffer());

      reply.header('Content-Type', contentType);
      reply.header('Cache-Control', cacheControl);
      return reply.send(bytes);
    },
  );
}
