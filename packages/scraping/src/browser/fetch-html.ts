import { chromium } from 'playwright-core';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getScraperCookieHeaderForUrl, getScraperUserAgent } from '../runtime-config.js';

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
  waitForStableSelector?: string;
  stableSelectorMinCount?: number;
  stableSelectorIdleMs?: number;
  stableSelectorTimeoutMs?: number;
  incrementalLoadSelector?: string;
  incrementalLoadMaxRounds?: number;
  incrementalLoadIdleRounds?: number;
  incrementalLoadRoundDelayMs?: number;
  waitAfterLoadMs?: number;
  cloudflareWaitMs?: number;
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

function isCloudflareBlock(html: string): boolean {
  return /Just a moment\.\.\.|Enable JavaScript and cookies to continue|cf-challenge|challenge-platform/i.test(html);
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
    waitForStableSelector,
    stableSelectorMinCount = 1,
    stableSelectorIdleMs = 4_000,
    stableSelectorTimeoutMs = 45_000,
    incrementalLoadSelector,
    incrementalLoadMaxRounds = 0,
    incrementalLoadIdleRounds = 3,
    incrementalLoadRoundDelayMs = 1_000,
    waitAfterLoadMs = 2_500,
    cloudflareWaitMs = 30_000,
    maxAttempts = 3,
    usePersistentContext = false,
    userDataDir,
  } = options;

  async function createContext() {
    const hostname = new URL(url).hostname;
    const contextOptions = {
      userAgent: await getScraperUserAgent(hostname),
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
      const cookieHeader = await getScraperCookieHeaderForUrl(url);
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
            { timeout: cloudflareWaitMs },
          )
          .catch(() => undefined);

        if (incrementalLoadSelector && incrementalLoadMaxRounds > 0) {
          let lastCount = await page.locator(incrementalLoadSelector).count().catch(() => 0);
          let idleRounds = 0;

          for (let round = 0; round < incrementalLoadMaxRounds && idleRounds < incrementalLoadIdleRounds; round++) {
            await page
              .evaluate((selector) => {
                const elements = Array.from(document.querySelectorAll(selector));
                const lastElement = elements.at(-1);
                if (lastElement) {
                  lastElement.scrollIntoView({ block: 'end' });
                }

                const scrollingElement = document.scrollingElement ?? document.documentElement;
                scrollingElement.scrollTop = scrollingElement.scrollHeight;
                window.scrollTo(0, document.body.scrollHeight);

                // Some sites keep the chapter list inside its own scrollable container.
                for (const element of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
                  if (element.scrollHeight > element.clientHeight + 20) {
                    element.scrollTop = element.scrollHeight;
                  }
                }
              }, incrementalLoadSelector)
              .catch(() => undefined);

            await page.mouse.wheel(0, 4_000).catch(() => undefined);
            await wait(incrementalLoadRoundDelayMs);
            await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

            const currentCount = await page.locator(incrementalLoadSelector).count().catch(() => lastCount);
            if (currentCount > lastCount) {
              lastCount = currentCount;
              idleRounds = 0;
            } else {
              idleRounds++;
            }
          }
        }

        if (waitForStableSelector) {
          await page
            .evaluate(() => {
              delete (window as Window & {
                __novelHubStableSelectorState?: { count: number; since: number };
              }).__novelHubStableSelectorState;
            })
            .catch(() => undefined);
          await page
            .waitForFunction(
              ({ selector, minCount, idleMs }) => {
                const win = window as Window & {
                  __novelHubStableSelectorState?: { count: number; since: number };
                };
                const now = Date.now();
                const count = document.querySelectorAll(selector).length;
                const state = win.__novelHubStableSelectorState ?? { count: -1, since: now };

                if (state.count !== count) {
                  win.__novelHubStableSelectorState = { count, since: now };
                  return false;
                }

                win.__novelHubStableSelectorState = state;
                return count >= minCount && now - state.since >= idleMs;
              },
              {
                selector: waitForStableSelector,
                minCount: stableSelectorMinCount,
                idleMs: stableSelectorIdleMs,
              },
              { timeout: stableSelectorTimeoutMs },
            )
            .catch(() => undefined);
        }

        lastHtml = await page.content();
        if (isCloudflareBlock(lastHtml)) {
          await wait(cloudflareWaitMs + attempt * 2_000);
          await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
        }

        if (waitAfterLoadMs > 0) {
          await wait(waitAfterLoadMs + (attempt - 1) * 1_500);
        }

        lastHtml = await page.content();
        const blocked = isCloudflareBlock(lastHtml);
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
