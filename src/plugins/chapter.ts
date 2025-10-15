import type MarkdownIt from 'markdown-it'
import { escapeHtml } from '../utils/escape-html'
import { matchFenceOpen } from '../utils/fence'
import { parseCurlyDataAttrs, buildDataAttrsString } from '../utils/blockAttrs'

/** Разбиваем "A | B | C" → subtitle="A", title="B | C" */
function splitChapterText(raw: string): { subtitle?: string; title: string } {
    const parts = raw.split('|')
    const first = (parts[0] ?? '').trim()
    const rest  = parts.slice(1).join('|').trim()
    if (parts.length > 1) return { subtitle: first, title: rest }
    return { title: first }
}

export function useChapter(md: MarkdownIt) {
    md.block.ruler.before(
        'paragraph',
        'dfm_chapter',
        (state, startLine, endLine, silent) => {
            const s = state.bMarks[startLine] + state.tShift[startLine]
            const e = state.eMarks[startLine]
            const line = state.src.slice(s, e)

            const open = matchFenceOpen(line)
            if (!open) return false
            if (open.name.toLowerCase() !== 'chapter') return false
            if (silent) return true

            const tail = (open.tail || '').trim()
            if (!tail) return false

            // ⬇️ вырезаем {...} из хвоста и получаем data-атрибуты
            const { cleanedTail, data } = parseCurlyDataAttrs(tail)
            const text = cleanedTail.trim()
            if (!text) return false

            const token = state.push('dfm_chapter', '', 0)
            token.block = true
            token.map = [startLine, startLine + 1]
            token.meta = { text, dataAttrs: data }

            state.line = startLine + 1
            return true
        },
        { alt: ['paragraph', 'blockquote', 'list'] }
    )

    md.renderer.rules['dfm_chapter'] = (tokens, idx) => {
        const meta  = tokens[idx].meta || {}
        const text  = String(meta.text || '')
        const data  = meta.dataAttrs || {}

        const { subtitle, title } = splitChapterText(text)
        const subHtml   = subtitle ? `<div class="chapter__subtitle">${escapeHtml(subtitle)}</div>` : ''
        const titleHtml = `<div class="chapter__title">${escapeHtml(title)}</div>`

        // ⬇️ добавим data-* на корневой div
        const dataStr = buildDataAttrsString(data)
        return `<div class="chapter" data-kind="chapter" data-value="${escapeHtml(text)}" ${dataStr}>${subHtml}${titleHtml}</div>\n`
    }
}
