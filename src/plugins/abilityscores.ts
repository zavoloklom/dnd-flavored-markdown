// markdown-it plugin for ::: abilityscores ... ::: blocks.
// The block accepts k=v tokens both on the opening line (after the keyword)
// and inside the body; both are parsed uniformly. Body wins on conflicts.

import type MarkdownIt from 'markdown-it'
import {
    clamp, parseKv, parseKvCombined, signed, splitList, toInt
} from '../utils/kv';
import { escapeHtml } from '../utils/escape-html';
import { matchFenceOpen, isFenceClose } from '../utils/fence';
import { buildDataAttrsString } from '../utils/blockAttrs';
import { getVar } from '../utils/scope';

// --- Enums requested ---
export enum Ability {
    STR = 'STR', DEX = 'DEX', CON = 'CON',
    INT = 'INT', WIS = 'WIS', CHA = 'CHA'
}

export enum BaseKey {
    TITLE = 'title',
    PB = 'pb',
    SAVES = 'saves'
}

// Template-literal types for dynamic keys derived from Ability
type LowerAbbr = Lowercase<keyof typeof Ability>           // 'str' | 'dex' | ...
type ScoreKey = LowerAbbr                                  // 'str' | ...
type ModKey = `mod_${LowerAbbr}`                           // 'mod_str' | ...
type SaveKey = `save_${LowerAbbr}`                         // 'save_str' | ...
type KnownKey = `${BaseKey}` | ScoreKey | ModKey | SaveKey // union of all valid keys

// Rendering order
const PHYSICAL: Ability[] = [Ability.STR, Ability.DEX, Ability.CON]
const MENTAL:   Ability[] = [Ability.INT, Ability.WIS, Ability.CHA]

interface AbilityData { score?: number; mod?: number; save?: number }
interface EnvDfm { statBlockStack?: Array<{ pb?: number }> }

// Public entry
export function useAbilityScores(md: MarkdownIt) {
    md.block.ruler.before(
        'fence',
        'dfm_abilityscores',
        abilityScoresRule as any,
        { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
    )
    md.renderer.rules['dfm_abilityscores'] = renderAbilityScores as any
}

/** Block rule: capture ::: abilityscores ... ::: and stash "infoTail" + inner raw text. */
function abilityScoresRule(state: any, startLine: number, endLine: number, silent: boolean): boolean {
    const s = state.bMarks[startLine]
    const e = state.eMarks[startLine]
    const firstLine = state.src.slice(s, e)

    const open = matchFenceOpen(firstLine)
    if (!open || open.name.toLowerCase() !== 'abilityscores') return false
    if (silent) return true

    const fenceLen = open.fenceLen
    const infoTail = open.tail
    const dataAttrs = open.dataAttrs

    let next = startLine + 1
    const bodyLines: string[] = []
    while (next < endLine) {
        const s2 = state.bMarks[next] + state.tShift[next]
        const e2 = state.eMarks[next]
        const ln = state.src.slice(s2, e2)
        if (isFenceClose(ln, fenceLen)) break
        bodyLines.push(ln)
        next++
    }

    const token = state.push('dfm_abilityscores', '', 0)
    token.block = true
    token.map = [startLine, next]
    token.meta = { infoTail, rawBody: bodyLines.join('\n'), dataAttrs }

    state.line = next + 1
    return true
}

/** Renderer: parse k=v, compute mods/saves, emit two tables. */
function renderAbilityScores(tokens: any[], idx: number, _opts: any, env: any): string {
    const token = tokens[idx]
    const { infoTail, rawBody } = token.meta as { infoTail: string; rawBody: string }

    // Merge tail + body; last wins
    const kv = parseKvCombined([infoTail, rawBody])

    // Build saves set
    const savesSet = new Set<Ability>()
    const savesRaw = kv.get(BaseKey.SAVES)
    if (savesRaw) {
        for (const s of splitList(savesRaw)) {
            const ab = toAbility(s)
            if (ab) savesSet.add(ab)
        }
    }

    // Resolve PB: explicit pb -> inherited -> 0
    const explicitPb = kv.get(BaseKey.PB)
    let pb = 0
    if (explicitPb != null && !Number.isNaN(toInt(explicitPb))) {
        pb = toInt(explicitPb)
    } else {
        pb = getVar<number>(env, 'pb') ?? 0
    }

    // Title (optional)
    const title = kv.get(BaseKey.TITLE)

    // Collect ability rows
    const abilities: Record<Ability, AbilityData> = {
        [Ability.STR]: {}, [Ability.DEX]: {}, [Ability.CON]: {},
        [Ability.INT]: {}, [Ability.WIS]: {}, [Ability.CHA]: {}
    }

    for (const ab of Object.values(Ability)) {
        const lower = ab.toLowerCase() as LowerAbbr
        const scoreStr = kv.get(lower as KnownKey as string)
        if (scoreStr != null) {
            const n = toInt(scoreStr)
            if (!Number.isNaN(n)) abilities[ab].score = clamp(n, 1, 30)
        }

        const modStr = kv.get(`mod_${lower}` as KnownKey as string)
        if (modStr != null) {
            const n = toInt(modStr)
            if (!Number.isNaN(n)) abilities[ab].mod = n
        }

        const saveStr = kv.get(`save_${lower}` as KnownKey as string)
        if (saveStr != null) {
            const n = toInt(saveStr)
            if (!Number.isNaN(n)) abilities[ab].save = n
        }
    }

    // Compute missing mods/saves
    for (const ab of Object.values(Ability)) {
        const a = abilities[ab]
        if (a.mod == null && a.score != null) a.mod = abilityMod(a.score)
        if (a.save == null && a.mod != null) {
            a.save = a.mod + (savesSet.has(ab) ? pb : 0)
        }
    }

    const dataAttrsStr = buildDataAttrsString(tokens[idx].meta?.dataAttrs ?? {});

    // Render HTML
    const out: string[] = []
    out.push(`<div class="ability-scores"${dataAttrsStr}>`)
    if (title) out.push(`<h4 class="ability-scores__title">${escapeHtml(title)}</h4>`)
    out.push('<div class="ability-scores__table">')
    out.push(renderTable('physical', PHYSICAL, abilities))
    out.push(renderTable('mental',   MENTAL,   abilities))
    out.push('</div>')
    out.push('</div>')
    return out.join('')
}

// ---- helpers ----

function abilityMod(score: number): number {
    return Math.floor((score - 10) / 2)
}

function toAbility(s: string | undefined): Ability | null {
    if (!s) return null
    switch (s.trim().toUpperCase()) {
        case 'STR': return Ability.STR
        case 'DEX': return Ability.DEX
        case 'CON': return Ability.CON
        case 'INT': return Ability.INT
        case 'WIS': return Ability.WIS
        case 'CHA': return Ability.CHA
        default: return null
    }
}

function renderTable(
    kind: 'physical'|'mental',
    order: Ability[],
    abilities: Record<Ability, AbilityData>
): string {
    const rows = order.map(ab => {
        const a = abilities[ab]
        const score = a.score != null ? String(a.score) : ''
        const mod   = a.mod  != null ? signed(a.mod)    : ''
        const save  = a.save != null ? signed(a.save)   : ''
        return `<tr>
  <th>${ab}</th>
  <td>${score}</td>
  <td class="modifier">${mod}</td>
  <td class="modifier">${save}</td>
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
