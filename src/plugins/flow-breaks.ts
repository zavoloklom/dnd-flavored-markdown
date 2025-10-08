// Single-line markers: page-break / column-break / column-reset
// Syntax: ":{N} page-break" (N >= 3) — no closing fence.

import type MarkdownIt from 'markdown-it'

const ONE_LINE = new Set(['page-break', 'column-break', 'column', 'column-reset'])

export function useFlowBreaks(md: MarkdownIt) {
    md.block.ruler.before(
        'fence',
        'dfm_flow-breaks',
        (state, startLine, _end, silent) => {
            const s = state.bMarks[startLine]
            const e = state.eMarks[startLine]
            const line = state.src.slice(s, e).trim()
            const m = /^:{3,}\s+([A-Za-z0-9_-]+)\s*$/.exec(line)
            if (!m) return false
            const name = m[1].toLowerCase()
            if (!ONE_LINE.has(name)) return false
            if (silent) return true

            const type =
                name === 'page-break'    ? 'dfm_page-break' :
                name === 'column-break'  ? 'dfm_column-break'  :
                name === 'column'  ? 'dfm_column-break'  :
                name === 'column-reset' ? 'dfm_column-reset' : null;

            if (!type) return false;

            const t = state.push(type, '', 0)
            t.block = true
            t.map = [startLine, startLine + 1]
            state.line = startLine + 1
            return true
        },
        { alt: ['paragraph', 'blockquote', 'list'] }
    )

    md.renderer.rules['dfm_page-break'] = () => '<div class="page-break"></div>\n'
    md.renderer.rules['dfm_column-break']  = () => '<div class="column-break"></div>\n'
    md.renderer.rules['dfm_column-reset']  = () => '<div class="column-reset"></div>\n'
}
