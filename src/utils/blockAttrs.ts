// Parse trailing "{...}" on a container's opening tail into data-* attributes.
// Example: tail=' {layout="wide" name="Imperial Guard" theme=dark}'
// -> cleanedTail: '' ; data: { layout: 'wide', name: 'Imperial Guard', theme: 'dark' }

import { escapeHtml } from './escape-html';

export interface ParsedBlockAttrs {
    cleanedTail: string
    data: Record<string, string>
}

export function parseCurlyDataAttrs(tail: string): ParsedBlockAttrs {
    const m = /\{([^}]*)\}\s*$/.exec(tail)
    if (!m) return { cleanedTail: tail, data: {} }

    const inside = m[1]
    const cleanedTail = tail.slice(0, m.index).trim()

    const data: Record<string, string> = {}
    // tokens: key=value | key="with spaces" | key='with spaces'
    // keys: letters/digits/_- (we'll normalize to kebab-case later)
    const re = /([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'}]+))/g
    let mm: RegExpExecArray | null
    while ((mm = re.exec(inside))) {
        const rawKey = mm[1]!
        const val = (mm[2] ?? mm[3] ?? mm[4] ?? '').trim()
        const key = toKebab(rawKey)
        if (key) data[key] = val
    }

    return { cleanedTail, data }
}

export function buildDataAttrsString(data: Record<string, string>): string {
    const parts: string[] = []
    for (const [k, v] of Object.entries(data)) {
        parts.push(` data-${escapeHtml(k)}="${escapeHtml(v)}"`)
    }
    return parts.join('')
}

function toKebab(s: string): string {
    // normalize: camelCase / snake_case / MIXED → kebab-case, lowercase
    return s
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[_\s]+/g, '-')
        .toLowerCase()
}
