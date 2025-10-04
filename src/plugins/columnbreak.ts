// DFM column break plugin (minimal).
// Syntax: a single line "::: columnbreak" (no closing block, no attrs).
// Emits a marker element that forces the next content to start in the next column.

import type MarkdownIt from 'markdown-it'

export function useColumnBreak(md: MarkdownIt) {
    md.block.ruler.before(
        'fence',
        'dfm_columnbreak',
        (state, startLine, _endLine, silent) => {
            const start = state.bMarks[startLine] + state.tShift[startLine]
            const end = state.eMarks[startLine]
            const line = state.src.slice(start, end).trim()
            if (line !== '::: columnbreak') return false
            if (silent) return true

            const token = state.push('dfm_columnbreak', '', 0)
            token.block = true
            token.map = [startLine, startLine + 1]
            state.line = startLine + 1
            return true
        },
        { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
    )

    md.renderer.rules['dfm_columnbreak'] = () => '<div class="columnbreak"></div>\n'
}
