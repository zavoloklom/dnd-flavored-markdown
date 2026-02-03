// scripts/pdf/browser.ts
import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import { type EnvConfig } from "./env.ts";
import { waitForServer } from "./server.ts";

export type BrowserResources = {
    browser: Browser;
    context: BrowserContext;
    page: Page;
};

export async function createBrowserPage(config: EnvConfig): Promise<BrowserResources> {
    await waitForServer(config.baseUrl);

    const browser = await chromium.launch({
        headless: true,
        args: ["--headless=new"],
    });

    const context = await browser.newContext({
        viewport: { width: 1200, height: 800 },
        deviceScaleFactor: config.deviceScaleFactor,
    });

    const page = await context.newPage();
    await page.goto(config.url, { waitUntil: "networkidle" });

    return { browser, context, page };
}
