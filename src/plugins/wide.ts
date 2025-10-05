// ::: wide … :::  → full-width block that spans across page columns
// Implementation uses markdown-it-container under the hood.
// All comments in English as requested.

import type MarkdownIt from 'markdown-it';
import { matchFenceOpen, isFenceClose } from '../utils/fence';

export function useWide(md: MarkdownIt) {
    md.block.ruler.before(
        'fence',
        'dfm_wide',
        (state, startLine, endLine, silent) => {
            const s = state.bMarks[startLine] + state.tShift[startLine]
            const e = state.eMarks[startLine]
            const first = state.src.slice(s, e)

            const open = matchFenceOpen(first)
            if (!open || open.name.toLowerCase() !== 'wide') return false
            if (silent) return true

            const fenceLen = open.fenceLen
            let next = startLine + 1
            const body: string[] = []
            while (next < endLine) {
                const s2 = state.bMarks[next] + state.tShift[next]
                const e2 = state.eMarks[next]
                const ln = state.src.slice(s2, e2)
                if (isFenceClose(ln, fenceLen)) break
                body.push(ln)
                next++
            }

            const tOpen = state.push('dfm_wide_open', '', 1);  tOpen.block = true
            const tBody = state.push('dfm_wide_body', '', 0);  tBody.block = true; tBody.meta = { raw: body.join('\n') }
            const tClose= state.push('dfm_wide_close','',-1);  tClose.block = true

            state.line = next + 1
            return true
        },
        { alt: ['paragraph','blockquote','list'] }
    )

    md.renderer.rules['dfm_wide_open']  = () => '<div class="wide">\n'
    md.renderer.rules['dfm_wide_body']  = (tokens, idx, _o, env) => {
        const raw = tokens[idx].meta?.raw ?? ''
        const inner = md.parse(raw, env)
        return md.renderer.render(inner, md.options, env)
    }
    md.renderer.rules['dfm_wide_close'] = () => '</div>\n'
}