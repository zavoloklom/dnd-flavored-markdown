import { useFlowBreaks } from '../plugins/flow-breaks';
import { usePage } from '../plugins/page';
import { useStatBlock } from '../plugins/stat-block';
import { useStatBlockSections } from '../plugins/stat-block-sections';
import { useAbilityScores } from '../plugins/abilityscores';
import { useContainer } from '../plugins/container';
import { useBlockquoteDescription } from '../plugins/blockquote-description'
import { escapeHtml } from '../utils/escape-html';

import type MarkdownIt from 'markdown-it';

export function applyDfmPlugins(md: MarkdownIt) {
    // Inline directive: {@dc 15} → <span class="dc" data-value="15">DC 15</span>
    md.inline.ruler.before('text', 'dfm_dc', (state, silent) => {
        const src = state.src
        const pos = state.pos
        if (src.charCodeAt(pos) !== 0x7B) return false
        const m = /\{@dc\s+(\d+)\}/y
        m.lastIndex = pos
        const match = m.exec(src)
        if (!match) return false
        if (!silent) {
            const token = state.push('dfm_dc', 'span', 0)
            token.attrs = [['class', 'dc'], ['data-value', match[1]]]
            token.content = `DC ${match[1]}`
        }
        state.pos = m.lastIndex
        return true
    })

    md.renderer.rules.dfm_dc = (tokens, idx) => {
        const t = tokens[idx]
        const cls = t.attrs?.find(([k]) => k === 'class')?.[1] ?? ''
        const val = t.attrs?.find(([k]) => k === 'data-value')?.[1] ?? ''
        const text = tokens[idx].content
        return `<span class="${cls}" data-value="${val}">${escapeHtml(text)}</span>`
    }

    useFlowBreaks(md);
    usePage(md);
    useStatBlock(md);
    useStatBlockSections(md);
    useAbilityScores(md);
    useBlockquoteDescription(md);

    /** Must be last **/
    useContainer(md);
}
