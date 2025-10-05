// Universal helpers for colon-fenced containers (nestable).
// Opening:  ":{N} <name> <tail...>" where N >= 3
// Closing:  exactly N colons on its own line (optionally surrounded by spaces).
// Single-line markers: ":{N} <keyword>" we treat elsewhere.

export interface FenceOpen {
    fenceLen: number
    name: string
    tail: string
}

/** Match a colon-fenced opening line. */
export function matchFenceOpen(lineRaw: string): FenceOpen | null {
    const line = lineRaw.trim()
    const m = /^(:{3,})\s+([A-Za-z0-9_-]+)(.*)$/.exec(line)
    if (!m) return null
    return {
        fenceLen: m[1].length,
        name: m[2],
        tail: (m[3] ?? '').trim(),
    }
}

/** Check if the given line is a closing fence of exactly N colons (ignoring outer spaces). */
export function isFenceClose(lineRaw: string, fenceLen: number): boolean {
    const t = lineRaw.trim()
    return t.length === fenceLen && /^:+$/.test(t)
}
