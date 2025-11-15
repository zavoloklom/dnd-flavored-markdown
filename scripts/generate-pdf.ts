// scripts/generate-pdf.ts
import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";
import { addMetadataToPdf } from "./pdf-metadata.ts";

async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeoutMs = 60_000) {
    const start = Date.now();
    // простой поллинг через fetch (Node 18+)
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url, { method: "GET" });
            if (res.ok) return;
        } catch (e) {
            // сервер ещё не поднялся
        }
        await wait(1000);
    }
    throw new Error(`Vite dev server not reachable at ${url} within ${timeoutMs}ms`);
}

async function main() {
    const docPath = process.env.DOC_PATH;
    if (!docPath) {
        throw new Error("Environment variable DOC_PATH is required, e.g. /content/the-missing-merchant/ru.md");
    }

    const port = process.env.VITE_PORT ?? "5173";
    const host = process.env.VITE_HOST ?? "127.0.0.1";

    const baseUrl = `http://${host}:${port}/`;
    const url = `${baseUrl}?doc=${encodeURIComponent(docPath)}`;

    const outputDir = process.env.OUTPUT_DIR ?? "/app/generated";
    const outputFile = process.env.OUTPUT_FILE ?? "output.pdf";

    const outputPath = path.join(outputDir, outputFile);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // ждём пока Vite поднимется
    await waitForServer(baseUrl);

    const browser = await chromium.launch({
        headless: true,
        args: ['--headless=new']
    });

    const page = await browser.newPage();

    // грузим страницу, ждём пока всё подтянется
    await page.goto(url, { waitUntil: "networkidle" });

    await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        outline: false,
        margin: {
            top: "0",
            right: "0",
            bottom: "0",
            left: "0",
        },
    });

    await browser.close();

    console.log(`PDF generated at: ${outputPath}`);

    // --- добавляем метаданные ---

    const metaTitle = process.env.PDF_TITLE ?? "Untitled document";
    const metaAuthor = process.env.PDF_AUTHOR ?? "Unknown";
    const metaSubject = process.env.PDF_SUBJECT ?? "";
    const metaKeywords = process.env.PDF_KEYWORDS
        ? process.env.PDF_KEYWORDS.split(",").map((k) => k.trim()).filter(Boolean)
        : [];
    const metaLanguage = process.env.PDF_LANG ?? process.env.DOC_LANG ?? "en";

    await addMetadataToPdf(outputPath, outputPath, {
        title: metaTitle,
        author: metaAuthor,
        subject: metaSubject,
        keywords: metaKeywords,
        language: metaLanguage,
    });

    console.log("PDF generated with metadata:", {
        path: outputPath,
        title: metaTitle,
        author: metaAuthor,
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
