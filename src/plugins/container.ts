// Generic DFM container: wraps any *unregistered* paired container name
// into <div class="dfm-container dfm-<name> <name>" data-kind="<name>" ...data-*>
//
// Syntax: :{N} <name> {key=value ...} ... :{N}   (N >= 3)

import type MarkdownIt from 'markdown-it'
import { matchFenceOpen, isFenceClose } from '../utils/fence'
import { buildAttrsString } from '../utils/block-attrs'
import {collectBodyRaw} from "../utils/collect-body";

export function useContainer(md: MarkdownIt) {
    md.block.ruler.before(
        'paragraph',                // ⬅️ важно: перед paragraph
        'dfm_container',
        (state, startLine, endLine, silent) => {
            const s = state.bMarks[startLine]
            const e = state.eMarks[startLine]
            const first = state.src.slice(s, e)

            const open = matchFenceOpen(first)
            if (!open) return false

            // если полагаетесь только на порядок — без реестра имён:
            // спец-плагины уже успеют схватить свои блоки,
            // сюда такие строки не дойдут.

            if (silent) return true

            const { rawBody, nextLine } = collectBodyRaw(state, startLine, endLine, open.fenceLen)

            // const fenceLen = open.fenceLen
            // let next = startLine + 1
            // const body: string[] = []
            // while (next < endLine) {
            //     const s2 = state.bMarks[next] + state.tShift[next]
            //     const e2 = state.eMarks[next]
            //     const ln = state.src.slice(s2, e2)
            //     if (isFenceClose(ln, fenceLen)) break
            //     body.push(ln)
            //     next++
            // }

            const tOpen = state.push('dfm_container_open', '', 1)
            tOpen.block = true
            tOpen.map = [startLine, nextLine]
            tOpen.meta = {
                rawName: open.name,
                kind: open.name.toLowerCase(),
                dataAttrs: { ...open.dataAttrs, kind: open.name.toLowerCase() },
                classes: open.classes ?? [],
                style: open.style ?? ''
            }

            const tBody = state.push('dfm_container_body', '', 0)
            tBody.block = true
            tBody.meta = { raw: rawBody }

            const tClose = state.push('dfm_container_close', '', -1)
            tClose.block = true

            state.line = nextLine + 1
            return true
        },
        { alt: ['paragraph', 'blockquote', 'list'] }
    )

    md.renderer.rules['dfm_container_open'] = (tokens, idx) => {
        const kind = tokens[idx].meta?.kind ?? 'box'
        const rawName = tokens[idx].meta?.rawName ?? kind

        const data    = tokens[idx].meta?.dataAttrs ?? {}
        const classes = tokens[idx].meta?.classes ?? []
        const style   = tokens[idx].meta?.style ?? ''

        const attrStr = buildAttrsString({
            classes: [...classes, 'dfm-container', rawName],
            style,
            data
        })

        return `<div${attrStr}>\n`
    }
    md.renderer.rules['dfm_container_body'] = (tokens, idx, _o, env) => {
        const raw = tokens[idx].meta?.raw ?? ''
        const inner = md.parse(raw, env)
        return md.renderer.render(inner, md.options, env)
    }
    md.renderer.rules['dfm_container_close'] = () => `</div>\n`

    function escape(s: string) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    }
}
