import { chromium } from 'playwright-core';

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
}

export async function launchBrowser() {
  const candidates = [
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

  let lastError: unknown = null;
  for (const executablePath of candidates) {
    try {
      return await chromium.launch({
        headless: true,
        executablePath,
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
  } = options;
  const browser = await launchBrowser();

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 1600 },
      locale: 'en-US',
      extraHTTPHeaders: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    try {
      const page = await context.newPage();
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
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
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
