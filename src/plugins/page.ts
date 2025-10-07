import type MarkdownIt from 'markdown-it'
import { matchFenceOpen } from '../utils/fence'
import { buildDataAttrsString } from '../utils/blockAttrs'

export function usePage(md: MarkdownIt) {
    md.block.ruler.before(
        'fence',
        'dfm_page_start',
        (state, startLine, _end, silent) => {
            const s = state.bMarks[startLine] + state.tShift[startLine]
            const e = state.eMarks[startLine]
            const line = state.src.slice(s, e)

            const open = matchFenceOpen(line)
            if (!open || open.name.toLowerCase() !== 'page') return false
            if (silent) return true

            const t = state.push('dfm_page_start', '', 0)
            t.block = true
            t.map = [startLine, startLine + 1]
            t.meta = { dataAttrs: open.dataAttrs } // {layout:..., bg:..., ...}
            state.line = startLine + 1
            return true
        },
        { alt: ['paragraph', 'blockquote', 'list'] }
    )

    md.renderer.rules['dfm_page_start'] = (tokens, idx) => {
        const data = tokens[idx].meta?.dataAttrs ?? {}
        const ds = buildDataAttrsString(data)
        return `<div class="page-start"${ds}></div>\n`
    }
}
