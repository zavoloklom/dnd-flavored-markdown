import * as fs from "node:fs";
import matter from "gray-matter";

export type FrontmatterData = {
    title?: string;
    author?: string;
    version?: string;
    subject?: string;
    keywords?: string[] | string;
    lang?: string;
    footnote?: string;
    showPageNumbers?: string;
};

/**
 * Читает frontmatter из markdown по path.
 * Если файла нет или там нет frontmatter — вернёт null, ничего не ломая.
 */
export function readFrontmatter(path: string): FrontmatterData | null {
    try {
        if (!fs.existsSync(path)) {
            console.warn(`Frontmatter: File not found: ${path}`);
            return null;
        }
        const raw = fs.readFileSync(path, "utf8");
        const parsed = matter(raw);
        if (!parsed || !parsed.data || typeof parsed.data !== "object") {
            console.log(parsed)
            return null;
        }
        return parsed.data as FrontmatterData;
    } catch (err) {
        console.warn(`Failed to read frontmatter from ${path}:`, err);
        return null;
    }
}