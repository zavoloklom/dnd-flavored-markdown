// DFM ::: stat-block … ::: plugin
// - Header zone: k=v tokens from the opening line tail + subsequent non-empty lines,
//   ended by the first blank line. (Last assignment wins, keys are case-insensitive.)
// - Pre-basics (AC/HP/Speed/Initiative) render BEFORE the first abilityscores.
// - Post-basics (CR/Languages/Senses) render RIGHT AFTER the first abilityscores.
//   If there is no abilityscores, post-basics render immediately after pre-basics.
// - Exposes pb to children via env.dfm.statBlockStack.
// - No nested stat-blocks (ignored; TODO: warn in dev if needed).

import type MarkdownIt from 'markdown-it'
import { parseKvCombined, escapeHtml, toInt } from '../utils/kv';
import { matchFenceOpen, isFenceClose } from '../utils/fence';
import { pushScope, popScope } from '../utils/scope';

type KeyLower =
    | 'name' | 'size' | 'type' | 'alignment'
    | 'ac' | 'hp' | 'speed' | 'initiative'
    | 'languages' | 'senses'
    | 'resistances' | 'vulnerabilities' | 'immunities' | 'skills' | 'gear' | 'habitats'
    | 'cr' | 'pb'

interface HeaderData {
    name?: string

    size?: string
    type?: string
    alignment?: string

    ac?: string
    hp?: string
    speed?: string
    initiative?: string

    languages?: string
    senses?: string

    cr?: string
    pb?: number
}

interface EnvDfm {
    statBlockStack?: Array<{ pb?: number }>
}

export function useStatBlock(md: MarkdownIt) {
    md.block.ruler.before(
        'fence',
        'dfm_stat-block',
        statBlockRule as any,
        { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
    )

    md.renderer.rules['dfm_stat-block_open'] = renderOpen as any
    md.renderer.rules['dfm_stat-block_body'] = renderBody as any
    md.renderer.rules['dfm_stat-block_close'] = renderClose as any

    function statBlockRule(state: any, startLine: number, endLine: number, silent: boolean): boolean {
        const s = state.bMarks[startLine] + state.tShift[startLine]
        const e = state.eMarks[startLine]
        const firstLine = state.src.slice(s, e)

        const open = matchFenceOpen(firstLine)
        if (!open || open.name.toLowerCase() !== 'stat-block') return false
        if (silent) return true

        const fenceLen = open.fenceLen
        const infoTail = open.tail

        // collect inner until matching close of the same fenceLen
        let next = startLine + 1
        const allInner: string[] = []
        while (next < endLine) {
            const s2 = state.bMarks[next] + state.tShift[next]
            const e2 = state.eMarks[next]
            const ln = state.src.slice(s2, e2)
            if (isFenceClose(ln, fenceLen)) break
            allInner.push(ln)
            next++
        }

        // split header/body by first blank line (same as before)
        let headerLines: string[] = []
        let bodyLines: string[] = []
        let seenBlank = false
        for (const ln of allInner) {
            const blank = ln.trim() === ''
            if (!seenBlank && !blank) headerLines.push(ln)
            else { seenBlank = true; bodyLines.push(ln) }
        }

        const openTok = state.push('dfm_stat-block_open', '', 1)
        openTok.block = true
        openTok.map = [startLine, next]
        openTok.meta = { infoTail, header: headerLines.join('\n') }

        const bodyTok = state.push('dfm_stat-block_body', '', 0)
        bodyTok.block = true
        bodyTok.meta = { rawBody: bodyLines.join('\n') }

        const closeTok = state.push('dfm_stat-block_close', '', -1)
        closeTok.block = true

        state.line = next + 1
        return true
    }

    // ---- renderers ----

    function renderOpen(tokens: any[], idx: number, _opts: any, env: any): string {
        // Parse header key/values
        const meta = tokens[idx].meta as { infoTail: string; header: string }
        const kv = parseKvCombined([meta.infoTail, meta.header])
        const h: HeaderData = {}

        // normalize & read values
        const get = (k: KeyLower) => kv.get(k) ?? kv.get(k.toLowerCase() as any)

        h.name = get('name') ?? ''
        h.size = get('size') ?? undefined
        h.type = get('type') ?? undefined
        h.alignment = get('alignment') ?? undefined

        // pb (number)
        const pbStr = get('pb')
        if (pbStr != null) {
            const n = toInt(pbStr)
            if (!Number.isNaN(n)) h.pb = n
        }

        // basics
        h.ac = get('ac') ?? undefined
        h.hp = get('hp') ?? undefined
        h.speed = get('speed') ?? undefined
        h.initiative = get('initiative') ?? undefined

        // post
        h.cr = get('cr') ?? undefined
        h.languages = get('languages') ?? undefined
        h.senses = get('senses') ?? undefined

        // Expose pb to children by pushing into env.dfm.statBlockStack.
        if (h.pb !== undefined) {
            pushScope(env, { pb: h.pb })
        } else {
            // даже если в этом статблоке pb не задан, мы можем всё равно
            // пушить пустую рамку, если хочешь «сбрасывать» наследование.
            // ИЛИ ничего не пушить — тогда будет видно верхний pb.
            pushScope(env, {}) // ← опционально; если не нужно — убери эту строку
        }

        // Build header HTML
        const title = h.name ? escapeHtml(h.name) : 'Statblock'
        const sub = buildSub(h.size, h.type, h.alignment)

        const preItems = [
            ['AC', h.ac],
            ['HP', h.hp],
            ['Speed', h.speed],
            ['Initiative', h.initiative],
        ].filter(([, v]) => v != null) as Array<[string, string]>

        const html: string[] = []
        html.push(`<article class="stat-block dfm-stat-block" role="note"${h.name ? ` aria-label="${escapeHtml(h.name)}"` : ''}>`)
        html.push(`<header class="stat-block__header">`)
        html.push(`<h2 class="stat-block__title">${title}</h2>`)
        if (sub) html.push(`<p class="stat-block__meta">${sub}</p>`)
        html.push(`</header>`)
        html.push(`<section class="stat-block__body">`)
        if (preItems.length) html.push(renderBasicsDL(preItems, 'pre'))

        // Stash parsed header for the body/close renderers (no recompute)
        tokens[idx].meta.headerData = h

        return html.join('')
    }

    function renderBody(tokens: any[], idx: number, _opts: any, env: any): string {
        const token = tokens[idx]
        const rawBody: string = token.meta?.rawBody ?? ''
        const header: HeaderData = tokens[idx - 1]?.meta?.headerData ?? {}

        // Parse inner body into tokens with current env (pb already pushed in OPEN)
        // NOTE: Abilityscores should be a top-level block; splitting token array around it is safe in v1.
        const innerTokens = md.parse(rawBody, env)

        // Find first abilityscores token
        const firstAbiIdx = innerTokens.findIndex(t => t.type === 'dfm_abilityscores')

        const postItems = [
            ['CR', header.cr],
            ['Languages', header.languages],
            ['Senses', header.senses],
        ].filter(([, v]) => v != null) as Array<[string, string]>

        const out: string[] = []

        if (firstAbiIdx === -1) {
            // No ability-scores: post-basics go right after pre-basics (i.e., at body start)
            if (postItems.length) out.push(renderBasicsDL(postItems, 'post'))
            out.push(md.renderer.render(innerTokens, md.options, env))
        } else {
            const before = innerTokens.slice(0, firstAbiIdx)
            const abi    = innerTokens.slice(firstAbiIdx, firstAbiIdx + 1)
            const after  = innerTokens.slice(firstAbiIdx + 1)

            out.push(md.renderer.render(before, md.options, env))
            out.push(md.renderer.render(abi, md.options, env))
            if (postItems.length) out.push(renderBasicsDL(postItems, 'post'))
            out.push(md.renderer.render(after, md.options, env))
        }

        return out.join('')
    }

    function renderClose(_tokens: any[], _idx: number, _opts: any, env: any): string {
        // Pop pb exposure when leaving stat-block
        popScope(env);

        return `</section></article>\n`
    }
}

// ---- helpers ----

function buildSub(size?: string, type?: string, alignment?: string): string {
    const a = [size, type].filter(Boolean).join(' ')
    if (a && alignment) return `${escapeHtml(a)}, ${escapeHtml(alignment)}`
    if (a) return escapeHtml(a)
    if (alignment) return escapeHtml(alignment)
    return ''
}

function renderBasicsDL(items: Array<[string, string]>, kind: 'pre' | 'post'): string {
    const left = items
        .filter(([label]) => label !== 'Initiative')
        .map(([label, val]) =>
            `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(val)}</dd></div>`)
        .join('');

    const right = items
        .filter(([label]) => label === 'Initiative')
        .map(([label, val]) =>
            `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(val)}</dd></div>`)
        .join('');

    const attributes = right ?
        `<dl>${left}</dl>\n<dl>${right}</dl>\n`
        : `<dl>${left}</dl>\n`;

    return `
      <div class="stat-block__attributes stat-block__attributes--${kind}">
        ${attributes}
      </div>`
}
