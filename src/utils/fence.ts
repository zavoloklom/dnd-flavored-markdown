// Universal helpers for colon-fenced containers (nestable).
// Opening:  ":{N} <name> <tail...>" where N >= 3
// Closing:  exactly N colons on its own line (optionally surrounded by spaces).

import { parseCurlyDataAttrs } from './block-attrs'

export interface FenceOpen {
    fenceLen: number
    name: string
    /** Tail WITHOUT trailing "{...}" block (if present). */
    tail: string
    /** Key-value map ready to render as data-* (kebab-cased). */
    dataAttrs: Record<string, string>
    /** Extra CSS classes gathered from {class|classes="..."} */
    classes: string[]
    /** Inline style gathered from {style="..."} */
    style?: string
}

/** Match a colon-fenced opening line. */
export function matchFenceOpen(lineRaw: string): FenceOpen | null {
    const line = lineRaw.trim()
    const m = /^(:{3,})\s+([A-Za-z0-9_-]+)(.*)$/.exec(line)
    if (!m) return null

    // Extract trailing {...} as attrs and strip it from the tail
    const { cleanedTail, data, classes, style } = parseCurlyDataAttrs(m[3] ?? '')

    return {
        fenceLen: m[1].length,
        name: m[2],
        tail: cleanedTail,      // хвост без {…}
        dataAttrs: data,        // для data-* (kebab-cased)
        classes: classes ?? [],
        style
    }
}

/** Check if the given line is a closing fence of exactly N colons (ignoring outer spaces). */
export function isFenceClose(lineRaw: string, fenceLen: number): boolean {
    const t = lineRaw.trim()
    return t.length === fenceLen && /^:+$/.test(t)
}
