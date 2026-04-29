type ProcessEnvMap = Record<string, string | undefined>;

export interface ScraperRuntimeSettings {
  cookies: string | null;
  userAgent: string | null;
}

type ScraperRuntimeSettingsProvider = (hostname: string) => Promise<ScraperRuntimeSettings | null>;

let settingsProvider: ScraperRuntimeSettingsProvider | null = null;

function getEnv(): ProcessEnvMap {
  return ((globalThis as typeof globalThis & { process?: { env?: ProcessEnvMap } }).process?.env) ?? {};
}

function envKeyForHost(hostname: string): string {
  return `SCRAPER_COOKIES_${hostname.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

export function setScraperRuntimeSettingsProvider(provider: ScraperRuntimeSettingsProvider | null) {
  settingsProvider = provider;
}

export async function getScraperRuntimeSettings(hostname: string): Promise<ScraperRuntimeSettings> {
  const env = getEnv();
  const rootHostname = hostname.replace(/^www\./i, '');
  const dynamicSettings = await settingsProvider?.(hostname);

  return {
    cookies: dynamicSettings?.cookies
      ?? env[envKeyForHost(hostname)]
      ?? env[envKeyForHost(rootHostname)]
      ?? env.SCRAPER_COOKIES
      ?? null,
    userAgent: dynamicSettings?.userAgent
      ?? env.SCRAPER_USER_AGENT
      ?? null,
  };
}

export async function getScraperUserAgent(hostname?: string): Promise<string> {
  const settings = hostname ? await getScraperRuntimeSettings(hostname) : null;
  return settings?.userAgent
    ?? getEnv().SCRAPER_USER_AGENT
    ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';
}

export async function getScraperCookieHeaderForUrl(url: string): Promise<string | null> {
  return (await getScraperRuntimeSettings(new URL(url).hostname)).cookies;
}
