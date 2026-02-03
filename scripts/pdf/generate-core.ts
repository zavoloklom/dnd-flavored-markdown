// scripts/pdf/generate-core.ts
import * as fs from "fs";
import { type Page } from "playwright";
import { type EnvConfig } from "./env.ts";
import { flattenImagesWithScreenshots } from "./flatten-images.ts";
import {addMetadataToPdf, type PdfMetadata} from "../pdf-metadata.ts";
import {readFrontmatter} from "../../src/utils/frontmatterData.ts";
import path from "node:path"; // как уже было

export async function ensureOutputDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export async function generatePdfFromPage(page: Page, outputPath: string) {
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
}

export async function applyMetadata(outputPath: string, config: EnvConfig) {
    const docPath = path.isAbsolute(config.docPath)
        ? config.docPath
        : path.resolve(process.cwd(), config.docPath);
    const frontmatter = readFrontmatter(docPath) ?? {};

    const data: PdfMetadata = {
        title: frontmatter.title,
        author: frontmatter.author,
        language: frontmatter.lang,
    }

    await addMetadataToPdf(outputPath, outputPath, data);
    console.log("PDF generated with metadata:", {
        path: outputPath,
        title: data.title,
        author: data.author,
    });
}

export async function generatePdfPipeline(config: EnvConfig, page: Page) {
    if (config.optimize) {
        console.log(
            `OPTIMIZE is enabled, deviceScaleFactor=${config.deviceScaleFactor}, flattening images...`,
        );
        await flattenImagesWithScreenshots(page);
    } else {
        console.log("OPTIMIZE is disabled, generating PDF without flattening images.");
    }

    await generatePdfFromPage(page, config.outputPath);
    console.log(`PDF generated at: ${config.outputPath}`);
    await applyMetadata(config.outputPath, config);
}
