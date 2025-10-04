// markdown-it plugin: ::: abilityscores ... :::
// Renders a two-table ability scores block (physical/mental).
// Inherits `pb` (proficiency bonus) from parent statblock via env.dfm.statblockStack (if provided).
//
// Syntax examples:
// ::: abilityscores title="Bear Form" pb=3
// str=19 dex=10 con=16 int=2 wis=13 cha=7
// saves="STR,CON"
// mod_str=+5 save_wis=+7
// :::
//
// Inside pairs are whitespace-separated key=value. Quotes allowed for strings.
// Lines starting with '#' or trailing comments ` # ...` are ignored.

import type MarkdownIt from 'markdown-it';

type Abbr = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

const PHYSICAL: Abbr[] = ['STR', 'DEX', 'CON']
const MENTAL:   Abbr[] = ['INT', 'WIS', 'CHA']

interface AbilityData {
    score?: number
    mod?: number           // explicit override, otherwise computed
    save?: number          // explicit override, otherwise computed
}

interface BlockAttrs {
    title?: string
    pb?: number
}

interface EnvDfm {
    statblockStack?: Array<{ pb?: number }>
    // you can extend later for more inheritance fields
}

// Public entry
export function useAbilityScores(md: MarkdownIt) {
    // Register a custom block rule to capture raw content between ::: abilityscores ... :::
    md.block.ruler.before(
        'fence',
        'dfm_abilityscores',
        abilityscoresRule as any,
        { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
    )

    // Renderer for our synthetic token
    md.renderer.rules['dfm_abilityscores'] = renderAbilityScores as any
}

/** Block rule: recognizes ::: abilityscores ... ::: and creates a single token with raw content + attrs. */
function abilityscoresRule(state: any, startLine: number, endLine: number, silent: boolean): boolean {
    const startPos = state.bMarks[startLine] + state.tShift[startLine]
    const maxPos = state.eMarks[startLine]
    const src = state.src.slice(startPos, maxPos).trim()

    if (!src.startsWith(':::')) return false
    const after = src.slice(3).trim()
    if (!after.toLowerCase().startsWith('abilityscores')) return false

    if (silent) return true

    // Parse inline attrs after 'abilityscores'
    const info = after.slice('abilityscores'.length).trim()
    const attrs = parseInlineAttrs(info) // { title?, pb? }

    // Find closing line ':::'
    let nextLine = startLine + 1
    let contentLines: string[] = []
    while (nextLine < endLine) {
        const lineStart = state.bMarks[nextLine] + state.tShift[nextLine]
        const lineEnd = state.eMarks[nextLine]
        const line = state.src.slice(lineStart, lineEnd)

        const trimmed = line.trim()
        if (trimmed.startsWith(':::')) {
            // stop on the first closing triple-colon
            break
        }
        contentLines.push(line)
        nextLine++
    }

    // Build a single token that carries everything needed to render
    const token = state.push('dfm_abilityscores', '', 0)
    token.map = [startLine, nextLine]
    token.block = true
    token.meta = {
        attrs,                               // opening-line attributes (title, pb)
        raw: contentLines.join('\n')         // raw inner text to parse pairs
    }

    state.line = nextLine + 1
    return true
}

/** Renderer: parse inner content → compute values → emit HTML. */
function renderAbilityScores(tokens: any[], idx: number, _opts: any, env: any): string {
    const token = tokens[idx]
    const meta = token.meta as { attrs: BlockAttrs; raw: string }
    const blockAttrs = meta.attrs ?? {}

    const inheritedPb =
        ((env?.dfm as EnvDfm | undefined)?.statblockStack?.at(-1)?.pb) ?? undefined
    const pb = pickNumber(blockAttrs.pb, inheritedPb, 0) // default 0 if absent

    const pairs = parseKeyValuePairs(meta.raw)
    const title = blockAttrs.title ?? pairs.get('title')

    // Read scores
    const abilities: Record<Abbr, AbilityData> = {
        STR: {}, DEX: {}, CON: {}, INT: {}, WIS: {}, CHA: {}
    }

    for (const abbr of ['str','dex','con','int','wis','cha'] as const) {
        const v = pairs.get(abbr)
        if (v != null) {
            const n = toInt(v)
            if (!Number.isNaN(n)) abilities[abbr.toUpperCase() as Abbr].score = clamp(n, 1, 30)
        }
    }

    // Parse saves list
    const savesRaw = pairs.get('saves')
    const saveSet = new Set<Abbr>()
    if (savesRaw) {
        for (const s of savesRaw.split(',').map(s => s.trim().toUpperCase())) {
            if (isAbbr(s)) saveSet.add(s)
        }
    }

    // Explicit overrides: mod_str=+2, save_wis=+7, etc.
    for (const [k, v] of pairs) {
        const m1 = /^mod_(str|dex|con|int|wis|cha)$/i.exec(k)
        if (m1) {
            const ab = m1[1].toUpperCase() as Abbr
            const n = toInt(v)
            if (!Number.isNaN(n)) abilities[ab].mod = n
            continue
        }
        const m2 = /^save_(str|dex|con|int|wis|cha)$/i.exec(k)
        if (m2) {
            const ab = m2[1].toUpperCase() as Abbr
            const n = toInt(v)
            if (!Number.isNaN(n)) abilities[ab].save = n
            continue
        }
    }

    // Compute mods & saves where not explicitly provided
    for (const ab of Object.keys(abilities) as Abbr[]) {
        const a = abilities[ab]
        if (a.mod == null && a.score != null) a.mod = abilityMod(a.score)
        if (a.save == null) {
            if (a.mod != null) a.save = a.mod + (saveSet.has(ab) ? pb : 0)
        }
    }

    // Build HTML
    const out: string[] = []
    out.push('<div class="mon-stat-block-2024__stats">')
    if (title) {
        out.push(`<h4 class="stat-subtitle">${escapeHtml(title)}</h4>`)
    }
    out.push(renderTable('physical', PHYSICAL, abilities))
    out.push(renderTable('mental',   MENTAL,   abilities))
    out.push('</div>')

    return out.join('')
}

// ---------- helpers ----------

function renderTable(kind: 'physical'|'mental', order: Abbr[], abilities: Record<Abbr, AbilityData>): string {
    const rows = order.map(ab => {
        const a = abilities[ab]
        if (!a.score && a.score !== 0) {
            // If score is missing, render empty slots (or skip row if you prefer)
            return `<tr><th>${ab}</th><td></td><td class="modifier"></td><td class="modifier"></td></tr>`
        }
        const modText  = a.mod  != null ? signed(a.mod)  : ''
        const saveText = a.save != null ? signed(a.save) : ''
        return `<tr>
  <th>${ab}</th>
  <td>${a.score}</td>
  <td class="modifier">${modText}</td>
  <td class="modifier">${saveText}</td>
</tr>`
    }).join('\n')

    return `<table class="stat-table ${kind}">
  <thead>
    <tr><th></th><th></th><th>Mod</th><th>Save</th></tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>`
}


// Parse attrs on the opening line: key=value (quotes optional)
function parseInlineAttrs(s: string): BlockAttrs {
    const map = new Map<string,string>()
    for (const [k, v] of lexKeyVals(s)) map.set(k, v)

    const out: BlockAttrs = {}
    if (map.has('title')) out.title = map.get('title')!
    if (map.has('pb')) {
        const n = toInt(map.get('pb')!)
        if (!Number.isNaN(n)) out.pb = n
    }
    return out
}

// Parse inner body into key=value pairs; supports comments: lines starting with '#' or trailing ' # ...'
function parseKeyValuePairs(body: string): Map<string,string> {
    const out = new Map<string,string>()
    const lines = body.split(/\r?\n/)
    for (let line of lines) {
        // strip trailing comment
        const hash = line.indexOf('#')
        if (hash >= 0) line = line.slice(0, hash)
        line = line.trim()
        if (!line) continue
        for (const [k, v] of lexKeyVals(line)) {
            out.set(k.toLowerCase(), v)
        }
    }
    return out
}

// Lex whitespace-separated key=value tokens with quotes support.
// Examples: str=13 saves="STR,CON" mod_str=+2
function* lexKeyVals(s: string): Iterable<[string,string]> {
    let i = 0
    const n = s.length
    while (i < n) {
        while (i < n && /\s/.test(s[i])) i++
        if (i >= n) break

        // key
        let k = ''
        while (i < n && /[A-Za-z0-9_\-]/.test(s[i])) { k += s[i++]; }
        if (!k) { // skip garbage token
            while (i < n && !/\s/.test(s[i])) i++
            continue
        }
        while (i < n && /\s/.test(s[i])) i++
        if (s[i] !== '=') { // key without '=', ignore token
            while (i < n && !/\s/.test(s[i])) i++
            continue
        }
        i++ // skip '='
        while (i < n && /\s/.test(s[i])) i++

        // value (quoted or bare)
        let v = ''
        if (s[i] === '"' || s[i] === "'") {
            const quote = s[i++]
            while (i < n && s[i] !== quote) { v += s[i++]; }
            if (s[i] === quote) i++
        } else {
            while (i < n && !/\s/.test(s[i])) { v += s[i++]; }
        }
        yield [k, v]
    }
}

function abilityMod(score: number): number {
    return Math.floor((score - 10) / 2)
}
function signed(n: number): string {
    return (n >= 0 ? '+' : '') + String(n)
}
function toInt(s: string): number {
    // Accept "+2", "-1", "2"
    const m = /^[-+]?\d+$/.exec(s.trim())
    return m ? parseInt(m[0], 10) : NaN
}
function clamp(n: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, n))
}
function isAbbr(s: string): s is Abbr {
    return s === 'STR' || s === 'DEX' || s === 'CON' || s === 'INT' || s === 'WIS' || s === 'CHA'
}
function pickNumber(...vals: Array<number | undefined>): number {
    for (const v of vals) if (typeof v === 'number') return v
    return 0
}
function escapeHtml(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
