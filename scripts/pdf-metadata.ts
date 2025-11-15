// scripts/pdf-metadata.ts
import { PDFDocument } from "pdf-lib";
import * as fs from "node:fs/promises";

export interface PdfMetadata {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[]; // ['dnd', 'adventure']
    language?: string;   // 'ru', 'en-US', etc.
}

export async function addMetadataToPdf(
    inputPath: string,
    outputPath: string,
    meta: PdfMetadata
): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    if (meta.title) {
        // showInWindowTitleBar опционально
        pdfDoc.setTitle(meta.title, { showInWindowTitleBar: true });
    }
    if (meta.author) {
        pdfDoc.setAuthor(meta.author);
    }
    if (meta.subject) {
        pdfDoc.setSubject(meta.subject);
    }
    if (meta.keywords && meta.keywords.length > 0) {
        pdfDoc.setKeywords(meta.keywords);
    }
    if (meta.language) {
        pdfDoc.setLanguage(meta.language);
    }

    // Можно выставлять даты/producer/creator — на твой вкус
    const now = new Date();
    pdfDoc.setCreationDate(now);
    pdfDoc.setModificationDate(now);
    pdfDoc.setProducer("D&D Flavored Markdown");
    pdfDoc.setCreator("D&D Flavored Markdown");

    const updatedBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, updatedBytes);
}
