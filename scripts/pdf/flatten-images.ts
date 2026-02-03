import { type ElementHandle, type Page } from "playwright";
import { writeFileSync } from "node:fs";
import * as path from "node:path";

const DEFAULT_MASK_SELECTORS = [
    ".mask.mask--watercolor-05",
    '.framed-image'
    // сюда добавишь другие проблемные маски
];

const DEFAULT_BG_SELECTORS = [
    ".page"
]

export type FlattenOptions = {
    selectors?: string[];
    clearBgSelectors?: string[];
};

export async function flattenImagesWithScreenshots(page: Page, options: FlattenOptions = {}) {
    const selectors = options.selectors ?? DEFAULT_MASK_SELECTORS;
    const clearBgSelectors = options.clearBgSelectors ?? DEFAULT_BG_SELECTORS;

    // Remove page background
    let styleHandle: ElementHandle | null = null;
    if (clearBgSelectors.length > 0) {
        const css = `${clearBgSelectors.join(", ")} { background: transparent !important; }`;
        styleHandle = await page.addStyleTag({ content: css });
    }

    let counter = 0;

    try {

        for (const selector of selectors) {
            const elements = await page.$$(selector);
            if (!elements.length) continue;

            for (const el of elements) {
                counter += 1;

                const buffer = await el.screenshot({ omitBackground: true, type: "png" });
                const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

                // For debug
                const saveImages = false;
                if (saveImages) {
                    const imageFsDir = '/app/generated/images/'
                    const fileName = `flattened-mask-${Date.now()}-${counter}.png`;
                    const fsPath = path.join(imageFsDir, fileName);
                    writeFileSync(fsPath, buffer);
                }

                await el.evaluate(
                    (element, payload: { src: string; originalSelector: string }) => {
                        const rect = element.getBoundingClientRect();
                        const img = document.createElement("img");

                        img.src = payload.src;
                        img.style.width = `${rect.width}px`;
                        img.style.height = `${rect.height}px`;
                        img.style.display = "block";
                        img.setAttribute("data-flattened-from", payload.originalSelector);

                        element.replaceWith(img);
                    },
                    { src: dataUrl, originalSelector: selector },
                );
            }
        }
    } finally {
        // Remove temporary style, recover background
        if (styleHandle) {
            await styleHandle.evaluate((el) => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
        }
    }

    if (counter > 0) {
        console.log(`Flattened ${counter} image element(s) into PNG screenshots.`);
    }
}
