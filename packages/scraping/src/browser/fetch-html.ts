import { chromium } from 'playwright-core';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type ProcessEnvMap = Record<string, string | undefined>;

function getEnv(): ProcessEnvMap {
  return ((globalThis as typeof globalThis & { process?: { env?: ProcessEnvMap } }).process?.env) ?? {};
}

function resolveExecutablePath(): string | null {
  const env = getEnv();
  const fromEnv = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (fromEnv) {
    return fromEnv;
  }
  return null;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FetchHtmlWithBrowserOptions {
  waitForSelectors?: string[];
  waitAfterLoadMs?: number;
  maxAttempts?: number;
  usePersistentContext?: boolean;
  userDataDir?: string;
}

const browserLaunchArgs = [
  '--disable-blink-features=AutomationControlled',
  '--disable-dev-shm-usage',
  '--disable-infobars',
  '--no-first-run',
  '--no-default-browser-check',
];

function getExecutableCandidates() {
  return [
    resolveExecutablePath() ?? undefined,
    undefined,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
}

function resolveUserDataDir(customUserDataDir?: string): string {
  const env = getEnv();
  return customUserDataDir
    ?? env.PLAYWRIGHT_USER_DATA_DIR
    ?? join(tmpdir(), 'novel-hub-browser-profile');
}

function envKeyForHost(hostname: string): string {
  return `SCRAPER_COOKIES_${hostname.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

function getCookieHeaderForUrl(url: string): string | null {
  const env = getEnv();
  const hostname = new URL(url).hostname;
  const rootHostname = hostname.replace(/^www\./i, '');

  return env[envKeyForHost(hostname)]
    ?? env[envKeyForHost(rootHostname)]
    ?? env.SCRAPER_COOKIES
    ?? null;
}

function parseCookieHeader(url: string, cookieHeader: string) {
  const parsedUrl = new URL(url);
  return cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0) {
        return null;
      }

      return {
        name: entry.slice(0, separatorIndex).trim(),
        value: entry.slice(separatorIndex + 1).trim(),
        domain: parsedUrl.hostname,
        path: '/',
        secure: parsedUrl.protocol === 'https:',
      };
    })
    .filter((cookie): cookie is NonNullable<typeof cookie> => cookie !== null);
}

export async function launchBrowser() {
  const candidates = getExecutableCandidates();

  let lastError: unknown = null;
  for (const executablePath of candidates) {
    try {
      return await chromium.launch({
        headless: true,
        executablePath,
        args: browserLaunchArgs,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Unable to launch a Chromium browser for browser-backed scraping. ${String(lastError instanceof Error ? lastError.message : lastError)}`,
  );
}

export async function fetchHtmlWithBrowser(
  url: string,
  options: FetchHtmlWithBrowserOptions = {},
): Promise<string> {
  const {
    waitForSelectors = [],
    waitAfterLoadMs = 2_500,
    maxAttempts = 3,
    usePersistentContext = false,
    userDataDir,
  } = options;

  async function createContext() {
    const contextOptions = {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 1600 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    };

    if (!usePersistentContext) {
      const browser = await launchBrowser();
      const context = await browser.newContext(contextOptions);
      return {
        context,
        close: async () => {
          await context.close();
          await browser.close();
        },
      };
    }

    const candidates = getExecutableCandidates();
    let lastError: unknown = null;
    for (const executablePath of candidates) {
      try {
        const context = await chromium.launchPersistentContext(
          resolveUserDataDir(userDataDir),
          {
            ...contextOptions,
            headless: true,
            executablePath,
            args: browserLaunchArgs,
          },
        );

        return {
          context,
          close: async () => {
            await context.close();
          },
        };
      } catch (error) {
        lastError = error;
      }
    }

    const browser = await launchBrowser();
    const context = await browser.newContext(contextOptions);
    return {
      context,
      close: async () => {
        await context.close();
        await browser.close();
      },
    };
  }

  const browserSession = await createContext();

  try {
      const cookieHeader = getCookieHeaderForUrl(url);
      if (cookieHeader) {
        await browserSession.context.addCookies(parseCookieHeader(url, cookieHeader));
      }

      const page = await browserSession.context.newPage();
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      });

      let lastHtml = '';
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

        for (const selector of waitForSelectors) {
          await page.waitForSelector(selector, { timeout: 12_000 }).catch(() => undefined);
        }

        await page
          .waitForFunction(
            "() => !document.title.includes('Just a moment') && !document.body.innerText.includes('Enable JavaScript and cookies to continue')",
            undefined,
            { timeout: 20_000 },
          )
          .catch(() => undefined);

        if (waitAfterLoadMs > 0) {
          await wait(waitAfterLoadMs + (attempt - 1) * 1_500);
        }

        lastHtml = await page.content();
        const blocked = /Just a moment\.\.\.|Enable JavaScript and cookies to continue/i.test(lastHtml);
        if (!blocked) {
          return lastHtml;
        }

        if (attempt < maxAttempts) {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => undefined);
          await wait(2_000 * attempt);
        }
      }

      return lastHtml;
  } finally {
    await browserSession.close();
  }
}
