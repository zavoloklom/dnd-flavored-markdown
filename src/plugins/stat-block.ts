// DFM ::: stat-block … ::: plugin
// - Header zone: k=v tokens from the opening line tail + subsequent non-empty lines,
//   ended by the first blank line. (Last assignment wins, keys are case-insensitive.)
// - Pre-basics (AC/HP/Speed/Initiative) render BEFORE the first abilityscores.
// - Post-basics (CR/Languages/Senses) render RIGHT AFTER the first abilityscores.
//   If there is no abilityscores, post-basics render immediately after pre-basics.
// - Exposes pb to children via env.dfm.statBlockStack.
// - No nested stat-blocks (ignored; TODO: warn in dev if needed).

import type MarkdownIt from 'markdown-it'
import {parseKvCombined, toInt} from '../utils/kv';
import {escapeHtml} from '../utils/escape-html';
import {isFenceClose, matchFenceOpen} from '../utils/fence';
import {popScope, pushScope} from '../utils/scope';
import {buildAttrsString} from '../utils/block-attrs';

/** StatBlock **/
interface StatBlock {
    name?: string;
    details?: GeneralDetails;
    highlights?: CombatHighlights;
    ability?: AbilityScores;
    other?: OtherDetails;
    unknown?: Record<string, string>;
    pb?: number;
    perceptionBonus?: number; /** Needed for Skills and Senses **/
}

interface GeneralDetails {
    size?: string;
    type?: string;
    alignment?: string;
}

interface CombatHighlights {
    ac?: string;
    hp?: string;
    speed?: string; /** Burrow, Climb, Fly, Swim **/
    initiative?: string;
}

interface OtherDetails {
    skills?: string;
    resistances?: string;
    vulnerabilities?: string;
    immunities?: string;
    gear?: string;
    senses?: string;
    languages?: string;
    habitats?: string;
    cr?: string;
}

interface AbilityScores {
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
}

const otherDetailsOrder: string[] = [
    'skills','resistances','immunities',
    'vulnerabilities','gear','senses','languages',
    'habitats','cr','pb'
]

export function useStatBlock(md: MarkdownIt) {
    md.block.ruler.before(
        'fence',
        'dfm_stat-block',
        statBlockRule as any,
        {alt: ['paragraph', 'reference', 'blockquote', 'list']}
    )

    md.renderer.rules['dfm_stat-block_open'] = renderOpen as any
    md.renderer.rules['dfm_stat-block_body'] = renderBody as any
    md.renderer.rules['dfm_stat-block_close'] = renderClose as any

    function statBlockRule(state: any, startLine: number, endLine: number, silent: boolean): boolean {
        const s = state.bMarks[startLine]
        const e = state.eMarks[startLine]
        const firstLine = state.src.slice(s, e)

        const open = matchFenceOpen(firstLine)
        if (!open || open.name.toLowerCase() !== 'stat-block') return false
        if (silent) return true

        const fenceLen = open.fenceLen
        const infoTail = open.tail
        const dataAttrs = open.dataAttrs

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
        // Строка считается kv, если в ней есть хотя бы один key=value
        const KV_AT_LINE_START = /^\s*[A-Za-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'}]+)/
        const isBlankOrComment = (ln: string) => ln.replace(/<!--[\s\S]*?-->/g, '').trim() === ''
        const H2_RE = /^\s{0,3}##\s+(.+?)\s*#*\s*$/  // ATX H2; срезаем хвостовые ###

        let keyValueLines: string[] = []

        let i = 0
        // 1) пропускаем ведущие пустые строки и html комментарии
        while (i < allInner.length && isBlankOrComment(allInner[i])) i++

        // 1.1) если H2 — запоминаем как titleFromHeading и двигаемся дальше
        let titleFromHeading: string | undefined
        if (i < allInner.length) {
            const mH2 = H2_RE.exec(allInner[i])
            if (mH2) {
                titleFromHeading = mH2[1].trim()
                i++
                // после заголовка тоже можно иметь пустые строки/комменты
                while (i < allInner.length && isBlankOrComment(allInner[i])) i++
            }
        }

        // 2) собираем шапку: только строки, которые НАЧИНАЮТСЯ с key=value
        for (; i < allInner.length; i++) {
            const ln = allInner[i]
            if (KV_AT_LINE_START.test(ln)) {
                keyValueLines.push(ln)
                continue
            }
            // любая другая строка — это уже тело
            break
        }
        // 3) остальное — тело
        const bodyLines = allInner.slice(i);
        const bodyRaw = bodyLines.join('\n');

        const openToken = state.push('dfm_stat-block_open', '', 1)
        openToken.block = true
        openToken.map = [startLine, next]
        openToken.meta = {
            bodyRaw,
            infoTail,
            header: keyValueLines.join('\n'), // TODO: rename
            titleFromHeading,
            dataAttrs,
            classes: open.classes ?? [],
            style: open.style ?? ''
        }

        const bodyToken = state.push('dfm_stat-block_body', '', 0)
        bodyToken.block = true
        bodyToken.meta = {rawBody: bodyRaw}

        const closeToken = state.push('dfm_stat-block_close', '', -1)
        closeToken.block = true

        state.line = next + 1
        return true
    }


    // ---- renderers ----

    function renderOpen(tokens: any[], idx: number, _opts: any, env: any): string {
        // Parse header key/values
        const meta = tokens[idx].meta || {}
        const kv = parseKvCombined([meta.infoTail, meta.header])

        /** map keyValue to interface **/
        const statBlock = createStatBlock(kv);

        // Expose pb to children by pushing into env.dfm.statBlockStack.
        pushScope(env, statBlock.pb !== undefined ? {pb: statBlock.pb} : {})

        // Build header HTML
        if (!statBlock.name || !statBlock.name.trim()) {
            const h2 = String(meta.titleFromHeading ?? '').trim()
            if (h2) statBlock.name = h2
        }
        const title = statBlock.name ? escapeHtml(statBlock.name) : 'Statblock';
        const subTitle = statBlock.details ? buildSubtitle(statBlock.details) : null;

        const data = meta.dataAttrs ?? {}
        const classes = meta.classes ?? []
        const style = meta.style ?? ''

        const attrStr = buildAttrsString({
            classes: [...classes, 'stat-block'],
            style,
            data
        })

        const html: string[] = []
        html.push(`<article${attrStr}>`)
        html.push(`<div class="stat-block__fake-shadow"></div>`)
        html.push(`<header class="stat-block__header">`)
        html.push(`<h2 class="stat-block__title">${title}</h2>`)
        if (subTitle) html.push(`<p class="stat-block__meta">${subTitle}</p>`)
        html.push(`</header>`)
        html.push(`<section class="stat-block__body">`)
        if (statBlock.highlights) html.push(renderHighlights(statBlock.highlights));

        // Stash parsed header for the body/close renderers (no recompute)
        tokens[idx].meta.statBlock = statBlock;

        return html.join('')
    }

    function renderBody(tokens: any[], idx: number, _opts: any, env: any): string {
        const token = tokens[idx]
        const rawBody: string = token.meta?.rawBody ?? ''
        const statBlock: StatBlock = tokens[idx - 1]?.meta?.statBlock ?? {}

        // Parse inner body into tokens with current env (pb already pushed in OPEN)
        // NOTE: Abilityscores should be a top-level block; splitting token array around it is safe in v1.
        const innerTokens = md.parse(rawBody, env)

        // Find first abilityscores token
        const firstAbiIdx = innerTokens.findIndex(t => t.type === 'dfm_abilityscores')

        const out: string[] = []

        if (firstAbiIdx === -1) {
            // No ability-scores: post-basics go right after pre-basics (i.e., at body start)
            if (statBlock.other) out.push(renderBasicsDL(statBlock.other, 'post'))
            if (statBlock.unknown) out.push(renderBasicsDL(statBlock.unknown, 'post'))
            out.push(md.renderer.render(innerTokens, md.options, env))
        } else {
            const before = innerTokens.slice(0, firstAbiIdx)
            const abi = innerTokens.slice(firstAbiIdx, firstAbiIdx + 1)
            const after = innerTokens.slice(firstAbiIdx + 1)

            out.push(md.renderer.render(before, md.options, env))
            out.push(md.renderer.render(abi, md.options, env))
            if (statBlock.other) out.push(renderBasicsDL(statBlock.other, 'post'))
            if (statBlock.unknown) out.push(renderBasicsDL(statBlock.unknown, 'post'))
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

function buildSubtitle(details: GeneralDetails): string {
    const a = [details.size, details.type].filter(Boolean).join(' ');
    if (a && details.alignment) return `${escapeHtml(a)}, ${escapeHtml(details.alignment)}`
    if (a) return escapeHtml(a)
    if (details.alignment) return escapeHtml(details.alignment)
    return ''
}

function renderDtDd(key: string, val: string): string {
    const keyLower = key.toLowerCase();
    // escapeHtml мешает для perception прокинуть перевод
    return `<div><dt data-i18n-key="stat.${escapeHtml(keyLower)}">${escapeHtml(keyLower)}</dt><dd>${val}</dd></div>`
}

function renderHighlights(highlights: CombatHighlights): string {
    let result = '';

    if (highlights.ac || highlights.hp || highlights.initiative) {
        result += `<div class="stat-block__attributes stat-block__attributes--highlights">`;

        if (highlights.ac || highlights.hp) {
            const ac = highlights.ac ? renderDtDd('ac', highlights.ac) : null;
            const hp = highlights.hp ? renderDtDd('hp', highlights.hp) : null;
            result += `<dl>${ac}${hp}</dl>\n`
        }
        if (highlights.initiative) {
            result += `<dl>${renderDtDd('initiative', highlights.initiative)}</dl>\n`
        }

        result += `</div>\n`
    }


    if (highlights.speed) {
        result += `<div class="stat-block__attributes"><dl>${renderDtDd('speed', highlights.speed)}</dl></div>\n`
    }

    return result;
}

function renderBasicsDL(kv: Record<string, any>, kind: 'pre' | 'post'): string {
    const items = sortEntries(Object.entries(kv), otherDetailsOrder);
    // отделяем initiative вправо, остальные влево — как у тебя
    const data = items
        .filter(([key]) => key !== 'initiative')
        .map(([key, val]) => renderDtDd(key, val))
        .join('')

    return `<div class="stat-block__attributes stat-block__attributes--${kind}">\n<dl>${data}</dl>\n</div>`
}

function createStatBlock(kv: Map<string, string>): StatBlock {
    const res: StatBlock = {};
    const unknown: Record<string, string> = {};

    for (const [rawKey, rawVal] of kv) {
        const key = (rawKey ?? "").toLowerCase().trim();
        const val = (rawVal ?? "").trim();
        if (!key || !val) continue;

        switch (key) {
            // top-level
            case "name":
                res.name = val;
                break;
            case "pb":
                res.pb = !Number.isNaN(toInt(val)) ? toInt(val) : undefined;
                break;
            case "perceptionbonus":
                res.perceptionBonus = !Number.isNaN(toInt(val)) ? toInt(val) : undefined;
                break;

            // details
            case "size":
            case "type":
            case "alignment":
                (res.details ??= {} as GeneralDetails)[key as keyof GeneralDetails] = val;
                break;

            // highlights
            case "ac":
            case "hp":
            case "speed":
                (res.highlights ??= {} as CombatHighlights)[key as keyof CombatHighlights] = val;
                break;
            case "initiative":
                (res.highlights ??= {} as CombatHighlights);
                const initNumber = toInt(val);
                res.highlights.initiative = !Number.isNaN(initNumber) ? `+${Math.floor((initNumber - 10))} (${initNumber})` : val;
                break;

            // other
            case "skills":
            case "resistances":
            case "vulnerabilities":
            case "immunities":
            case "gear":
            case "senses":
            case "languages":
            case "habitats":
            case "cr":
                (res.other ??= {} as OtherDetails)[key as keyof OtherDetails] = val;
                break;

            // unknown
            default:
                unknown[key] = val;
                break;
        }
    }

    (res.other ??= {} as OtherDetails);
    if (res.perceptionBonus) {
        res.other.skills = [`<span data-i18n-key="skill.perception">Perception</span> +${res.perceptionBonus}`, res.other.skills]
            .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
            .join(', ');
    }
    const passivePerception = (res.ability?.wis ?? 10) + (res.perceptionBonus ?? 0);
    res.other.senses = [`<span data-i18n-key="senses.passive-perception">Passive Perception</span> ${passivePerception}`, res.other.senses]
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .join(', ');


    if (Object.keys(unknown).length) res.unknown = unknown;
    return res;
}

/** TODO: To utils **/
function sortEntries(entries: [string, any][], order: string[]) {
    // вес для сортировки: чем меньше, тем раньше
    const weights = new Map(order.map((k, i) => [k, i] as const));

    return [...entries].sort(([aKey], [bKey]) => {
        const wa = weights.has(aKey) ? (weights.get(aKey) as number) : Number.MAX_SAFE_INTEGER;
        const wb = weights.has(bKey) ? (weights.get(bKey) as number) : Number.MAX_SAFE_INTEGER;
        if (wa !== wb) return wa - wb;
        return aKey.localeCompare(bKey);
    });
}

/** To utils? **/
// ${Math.floor((initNumber - 10) / 2)} (${initNumber}
