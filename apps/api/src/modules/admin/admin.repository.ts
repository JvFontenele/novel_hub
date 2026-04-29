import { sql } from '../../db/client.js';
import type { ScraperSettingView } from '@novel-hub/contracts';

export async function listCollectorRuns(limit = 50) {
  return sql`
    SELECT
      cr.id,
      cr.source_id AS "sourceId",
      ns.url AS "sourceUrl",
      cr.status,
      cr.chapters_found AS "chaptersFound",
      cr.chapters_new AS "chaptersNew",
      cr.error_message AS "errorMessage",
      cr.duration_ms AS "durationMs",
      cr.started_at AS "startedAt",
      cr.finished_at AS "finishedAt"
    FROM collector_runs cr
    JOIN novel_sources ns ON ns.id = cr.source_id
    ORDER BY cr.started_at DESC
    LIMIT ${limit}
  `;
}

export async function listSourceFailures() {
  return sql`
    SELECT
      ns.id AS "sourceId",
      ns.url AS "sourceUrl",
      n.title AS "novelTitle",
      ns.status,
      ns.consecutive_failures AS "consecutiveFailures",
      ns.last_checked_at AS "lastCheckedAt"
    FROM novel_sources ns
    JOIN novels n ON n.id = ns.novel_id
    WHERE ns.consecutive_failures > 0
    ORDER BY ns.consecutive_failures DESC
    LIMIT 50
  `;
}

function normalizeHostname(hostname: string) {
  return hostname
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

function previewCookies(cookies: string | null) {
  if (!cookies) return null;
  return cookies.length <= 24 ? cookies : `${cookies.slice(0, 12)}...${cookies.slice(-8)}`;
}

interface ScraperSettingRow {
  hostname: string;
  cookies: string | null;
  user_agent: string | null;
  updated_at: string;
}

function mapScraperSetting(row: ScraperSettingRow): ScraperSettingView {
  return {
    hostname: row.hostname,
    hasCookies: Boolean(row.cookies),
    cookiesPreview: previewCookies(row.cookies),
    userAgent: row.user_agent,
    updatedAt: row.updated_at,
  };
}

export async function listScraperSettings() {
  const rows = await sql`
    SELECT hostname, cookies, user_agent, updated_at
    FROM scraper_settings
    ORDER BY hostname ASC
  `;

  return (rows as unknown as ScraperSettingRow[]).map(mapScraperSetting);
}

export async function getScraperSettingsForHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  const withoutWww = normalized.replace(/^www\./, '');
  const [row] = await sql`
    SELECT hostname, cookies, user_agent, updated_at
    FROM scraper_settings
    WHERE hostname IN ${sql([normalized, withoutWww])}
    ORDER BY CASE WHEN hostname = ${normalized} THEN 0 ELSE 1 END
    LIMIT 1
  `;

  return row ?? null;
}

export async function upsertScraperSetting(input: {
  hostname: string;
  cookies: string | null;
  userAgent: string | null;
  updatedBy: string;
}) {
  const hostname = normalizeHostname(input.hostname);
  const cookies = input.cookies?.trim() || null;
  const userAgent = input.userAgent?.trim() || null;

  const [row] = await sql`
    INSERT INTO scraper_settings (hostname, cookies, user_agent, updated_by, updated_at)
    VALUES (${hostname}, ${cookies}, ${userAgent}, ${input.updatedBy}, NOW())
    ON CONFLICT (hostname) DO UPDATE SET
      cookies = EXCLUDED.cookies,
      user_agent = EXCLUDED.user_agent,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING hostname, cookies, user_agent, updated_at
  `;

  return mapScraperSetting(row as unknown as ScraperSettingRow);
}
