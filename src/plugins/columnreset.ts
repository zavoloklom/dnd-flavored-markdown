import type MarkdownIt from 'markdown-it'

export function useColumnReset(md: MarkdownIt) {
    md.block.ruler.before(
        'fence',
        'dfm_columnreset',
        (state, startLine, _endLine, silent) => {
            const start = state.bMarks[startLine] + state.tShift[startLine]
            const end = state.eMarks[startLine]
            const line = state.src.slice(start, end).trim()
            if (line !== '::: columnreset') return false
            if (silent) return true

            const t = state.push('dfm_columnreset', '', 0)
            t.block = true
            t.map = [startLine, startLine + 1]
            state.line = startLine + 1
            return true
        },
        { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
    )

    // zero-height, but column-spanning element — «обнуляет» ряд колонок
    md.renderer.rules['dfm_columnreset'] = () => '<div class="columnreset"></div>\n'
}
