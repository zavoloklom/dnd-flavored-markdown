// DFM page break plugin (minimal).
// Syntax: a single line "::: pagebreak" with no closing block or attributes.
// Renderer emits a marker element that the chunker will later consume.

import type MarkdownIt from 'markdown-it'

export function usePageBreak(md: MarkdownIt) {
    md.block.ruler.before(
        'fence',
        'dfm_pagebreak',
        (state, startLine, _endLine, silent) => {
            const start = state.bMarks[startLine] + state.tShift[startLine]
            const end = state.eMarks[startLine]
            const line = state.src.slice(start, end).trim()
            if (line !== '::: pagebreak') return false
            if (silent) return true

            const token = state.push('dfm_pagebreak', '', 0)
            token.block = true
            token.map = [startLine, startLine + 1]
            state.line = startLine + 1
            return true
        },
        { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
    )

    md.renderer.rules['dfm_pagebreak'] = () => '<div class="pagebreak"></div>\n'
}
