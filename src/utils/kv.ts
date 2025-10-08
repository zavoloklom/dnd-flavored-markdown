// Generic key=value parsing utilities for DFM blocks.
// All comments in English as requested.

/** Parse k=v tokens from arbitrary text (multi-line). Last assignment wins. */
export function parseKv(text: string): Map<string, string> {
    const out = new Map<string, string>()
    const lines = text.split(/\r?\n/)
    for (let raw of lines) {
        // strip trailing comment
        const hash = raw.indexOf('#')
        if (hash >= 0) raw = raw.slice(0, hash)
        const line = raw.trim()
        if (!line) continue
        for (const [k, v] of lexKeyVals(line)) {
            out.set(k.toLowerCase(), v)
        }
    }
    return out
}

/** Merge and parse several text chunks as if they were one. Later parts win. */
export function parseKvCombined(parts: string[]): Map<string, string> {
    return parseKv(parts.filter(Boolean).join('\n'))
}

/** Tokenizer that yields [key, value] for "key=value", respecting quotes. */
function* lexKeyVals(s: string): Iterable<[string, string]> {
    let i = 0, n = s.length
    while (i < n) {
        while (i < n && /\s/.test(s[i])) i++
        if (i >= n) break

        // key
        let k = ''
        while (i < n && /[A-Za-z0-9_\-]/.test(s[i])) k += s[i++]
        if (!k) { while (i < n && !/\s/.test(s[i])) i++; continue }

        while (i < n && /\s/.test(s[i])) i++
        if (s[i] !== '=') { while (i < n && !/\s/.test(s[i])) i++; continue }
        i++ // '='
        while (i < n && /\s/.test(s[i])) i++

        // value (quoted or bare)
        let v = ''
        if (s[i] === '"' || s[i] === "'") {
            const q = s[i++]
            while (i < n && s[i] !== q) v += s[i++]
            if (s[i] === q) i++
        } else {
            while (i < n && !/\s/.test(s[i])) v += s[i++]
        }
        yield [k, v]
    }
}

/** Helpers shared across plugins */
export const toInt = (s: string): number => {
    const m = /^[-+]?\d+$/.exec(s.trim())
    return m ? parseInt(m[0], 10) : NaN
}

export const clamp = (n: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, n))

export const signed = (n: number) => (n >= 0 ? '+' : '') + String(n)

/** Split saves list like "STR,CON" or "dex wis" or "Str;Cha". */
export function splitList(s: string): string[] {
    return s.split(/[,\s;]+/).map(t => t.trim()).filter(Boolean)
}
