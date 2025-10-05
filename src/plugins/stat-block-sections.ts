import type MarkdownIt from 'markdown-it'
import { matchFenceOpen, isFenceClose } from '../utils/fence'

// name -> [cssClass, HeadingText]
const StatBlockSections: Record<string,[string,string]> = {
    'traits':             ['sb-traits',             'Traits'],
    'actions':            ['sb-actions',            'Actions'],
    'bonus-actions':      ['sb-bonus-actions',      'Bonus Actions'],
    'reactions':          ['sb-reactions',          'Reactions'],
    'legendary-actions':  ['sb-legendary-actions',  'Legendary Actions'],
    'lair-actions':       ['sb-lair-actions',       'Lair Actions'],
    'mythic-actions':     ['sb-mythic-actions',     'Mythic Actions'],
}

export function useStatBlockSections(md: MarkdownIt) {
    md.block.ruler.before(
        'fence',
        'dfm_sections',
        (state, startLine, endLine, silent) => {
            const s = state.bMarks[startLine] + state.tShift[startLine]
            const e = state.eMarks[startLine]
            const first = state.src.slice(s, e)

            const open = matchFenceOpen(first)
            if (!open) return false
            const key = open.name.toLowerCase()
            const spec = StatBlockSections[key]
            if (!spec) return false
            if (silent) return true

            const [cssClass, heading] = spec
            const fenceLen = open.fenceLen

            // collect body until matching close
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

            const tOpen = state.push('dfm_section_open', '', 1); tOpen.meta = { cssClass, heading }
            const tBody = state.push('dfm_section_body', '', 0); tBody.meta = { raw: body.join('\n') }
            const tClose= state.push('dfm_section_close','',-1)

            state.line = next + 1
            return true
        },
        { alt: ['paragraph','blockquote','list'] }
    )

    md.renderer.rules['dfm_section_open'] = (tokens, idx) => {
        const { cssClass, heading } = tokens[idx].meta
        return `<section class="stat-block__section ${cssClass}">\n<h3 class="stat-block__section-title">${escapeHtml(heading)}</h3>\n<div class="stat-block__section-content">\n`
    }
    md.renderer.rules['dfm_section_body'] = (tokens, idx, _o, env) => {
        const raw = tokens[idx].meta?.raw ?? ''
        const inner = md.parse(raw, env)
        return md.renderer.render(inner, md.options, env)
    }
    md.renderer.rules['dfm_section_close'] = () => '</div>\n</section>\n'

    function escapeHtml(s: string) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    }
}
