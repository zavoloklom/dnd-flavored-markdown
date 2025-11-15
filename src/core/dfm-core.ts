// Single source of truth used by both CLI and Vite preview.

import MarkdownIt from 'markdown-it'
import mkAttrs from 'markdown-it-attrs'
import matter, {GrayMatterFile} from 'gray-matter'
import { applyDfmPlugins } from './dfm-plugins';
import { escapeHtml } from '../utils/escape-html';

// --- Markdown factory (shared) ---
export function createMarkdownIt(fm: GrayMatterFile<string>): MarkdownIt {
    const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
        .use(mkAttrs)
    applyDfmPlugins(md, fm)
    return md
}

// --- Render pipeline (shared) ---
export function renderMarkdownToBody(markdownSource: string) {
    const fm = matter(markdownSource) // { data, content }
    const md = createMarkdownIt(fm)
    const bodyHtml = md.render(fm.content)
    return { bodyHtml, frontmatter: (fm.data ?? {}) as Record<string, unknown> }
}

// --- HTML document wrapper (shared) ---
type CssConfig =
    | { inline: { screen?: string; print?: string } }
    | { hrefs: { screen: string; print: string } }

export function buildHtmlDocument({
                                      title = 'DFM Document',
                                      bodyHtml,
                                      css = { hrefs: { screen: '/themes/default/screen.css', print: '/themes/default/print.css' } }
                                  }: {
    title?: string
    bodyHtml: string
    css?: CssConfig
}) {
    const headCss =
        'inline' in css
            ? `<style media="screen">${css.inline.screen ?? ''}</style>
<style media="print">${css.inline.print ?? ''}</style>`
            : `<link rel="stylesheet" href="${css.hrefs.screen}" media="screen"/>
<link rel="stylesheet" href="${css.hrefs.print}" media="print"/>`

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title>
${headCss}
</head>
<body>
<main class="content">
${bodyHtml}
</main>
</body>
</html>`
}
