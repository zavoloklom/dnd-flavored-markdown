import { join } from "node:path";

import 'dotenv/config';
import {normalizeBoolean} from "../../src/utils/normalize-boolean.ts";

export type PdfMetadata = {
    title: string;
    author: string;
    subject: string;
    keywords: string[];
    language: string;
};

export type EnvConfig = {
    docPath: string;
    baseUrl: string;
    url: string;
    outputDir: string;
    outputPath: string;
    metadata: PdfMetadata;
    optimize: boolean;
    deviceScaleFactor: number;
};

export function readEnvConfig(): EnvConfig {
    const docPath = process.env.DOC_PATH;
    if (!docPath) {
        throw new Error("DOC_PATH is required, e.g. /content/the-missing-merchant/ru.md");
    }

    const port = process.env.VITE_PORT ?? "5173";
    const host = process.env.VITE_HOST ?? "127.0.0.1";

    const baseUrl = `http://${host}:${port}/`;
    const url = `${baseUrl}?doc=${encodeURIComponent(docPath)}`;

    const outputDir = process.env.OUTPUT_DIR ?? "/app/generated";
    const outputFile = process.env.OUTPUT_FILE ?? "output.pdf";
    const outputPath = join(outputDir, outputFile);

    const metaTitle = process.env.PDF_TITLE ?? "Untitled document";
    const metaAuthor = process.env.PDF_AUTHOR ?? "Unknown";
    const metaSubject = process.env.PDF_SUBJECT ?? "";
    const metaKeywords = process.env.PDF_KEYWORDS
        ? process.env.PDF_KEYWORDS.split(",").map((k) => k.trim()).filter(Boolean)
        : [];
    const metaLanguage = process.env.PDF_LANG ?? process.env.DOC_LANG ?? "en";

    const optimize = normalizeBoolean(process.env.OPTIMIZE_FLATTEN_IMAGES) ?? true;
    const dpiRaw = process.env.DPI_SCALE ?? (optimize ? "4" : "1");
    const parsed = Number(dpiRaw);
    const deviceScaleFactor = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

    return {
        docPath,
        baseUrl,
        url,
        outputDir,
        outputPath,
        metadata: {
            title: metaTitle,
            author: metaAuthor,
            subject: metaSubject,
            keywords: metaKeywords,
            language: metaLanguage,
        },
        optimize,
        deviceScaleFactor,
    };
}
