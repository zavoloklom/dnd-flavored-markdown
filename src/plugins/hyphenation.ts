import { hyphenateSync as hyphenateRu } from "hyphen/ru";
import { hyphenateSync as hyphenateEn } from "hyphen/en";
import type MarkdownIt from "markdown-it";

type LangCode = "ru" | "en";

function createHyphenator(lang: string) {
    switch (lang) {
        case "ru":
            return hyphenateRu;
        case "en":
            return hyphenateEn;
        default:
            // можно вернуть no-op, чтобы не падать на неожиданных языках
            return (text: string) => text;
    }
}

export function useHyphenation(md: MarkdownIt, lang: string) {
    const hyphenate = createHyphenator(lang);

    md.core.ruler.push("hyphenation", (state) => {
        const tokens = state.tokens;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            // интересуют только параграфы
            if (token.type !== "paragraph_open") continue;

            const inline = tokens[i + 1];
            if (!inline || inline.type !== "inline" || !inline.children) continue;

            // внутри параграфа модифицируем только текстовые ноды
            for (const child of inline.children) {
                if (child.type === "text") {
                    child.content = hyphenate(child.content);
                }
            }
        }
    });
}