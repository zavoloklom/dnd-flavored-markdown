// scripts/generate-pdf.ts
import { readEnvConfig } from "./pdf/env.ts";
import { ensureOutputDir, generatePdfPipeline } from "./pdf/generate-core.ts";
import { createBrowserPage } from "./pdf/browser.ts";

async function main() {
    const config = readEnvConfig();

    await ensureOutputDir(config.outputDir);

    const { browser, page } = await createBrowserPage(config);

    try {
        await generatePdfPipeline(config, page);
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
