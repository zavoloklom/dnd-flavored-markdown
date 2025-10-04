// ::: wide … :::  → full-width block that spans across page columns
// Implementation uses markdown-it-container under the hood.
// All comments in English as requested.

import type MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';

export function useWide(md: MarkdownIt) {
    md.use(container, 'wide', {
        // accept only bare "wide" (no params/attrs)
        validate: (params: string) => params.trim().toLowerCase() === 'wide',
        render(tokens: { [x: string]: { nesting: number } }, idx: string | number) {
            return tokens[idx].nesting === 1
                ? '<div class="wide">\n'
                : '</div>\n'
        }
    })
}