import type MarkdownIt from 'markdown-it'

export type DcType = 'ability' | 'skill'
export type DcDict = Record<string, DcType>

export interface DcOptions {
    /** Словарь: ключ в нижнем регистре (латиница, можно с дефисами) → тип */
    dict?: DcDict
}

/** Простая нормализация «ключевого слова» после @ */
function normalizeHead(s: string): string {
    // снимаем диакритику (на случай «É» и т.п.), в нижний регистр
    const lower = s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    // подчёркивания → дефисы, лишние обрезаем по краям
    return lower.replace(/_/g, '-').replace(/^-+|-+$/g, '')
}

/** Разбор `@Head [rest...]` → { head, rest } */
function splitHeadRest(contentWithoutAt: string): { head: string; rest: string } {
    const m = /^([^\s]+)\s*(.*)$/.exec(contentWithoutAt.trim()) // head = до первого пробела
    return {
        head: m?.[1] ?? '',
        rest: m?.[2] ?? ''
    }
}

/** Словарь по умолчанию: 5e abilities + skills */
function defaultDict(): DcDict {
    const D: DcDict = Object.create(null);
    // abilities
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(k => (D[k] = 'ability'));
    // skills
    [
        'acrobatics',
        'animal-handling',
        'arcana',
        'athletics',
        'deception',
        'history',
        'insight',
        'intimidation',
        'investigation',
        'medicine',
        'nature',
        'perception',
        'performance',
        'persuasion',
        'religion',
        'sleight-of-hand',
        'stealth',
        'survival'
    ].forEach(k => (D[k] = 'skill'));

    // лёгкие алиасы (по желанию можно расширить):
    D['sleightofhand'] = 'skill' // без дефисов
    D['animalhandling'] = 'skill'
    D['invest'] = 'skill'
    D['percep'] = 'skill'
    D['persuade'] = 'skill'
    return D
}

/**
 * Плагин: инлайн-код с @ → <code class="dc" ...>
 * Пример: `@Nature 12` → <code class="dc" data-key="nature" data-type="skill" data-value="12">Nature 12</code>
 */
export function useDcInline(md: MarkdownIt, opts: DcOptions = {}) {
    const dict = Object.assign(defaultDict(), opts.dict || {})
    const esc = md.utils.escapeHtml

    const orig = md.renderer.rules.code_inline

    md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        const src = token.content || ''

        // обрабатываем только те, что начинаются с '@'
        if (src.startsWith('@')) {
            const after = src.slice(1) // убираем только первую '@' из видимого текста
            const { head, rest } = splitHeadRest(after)
            const norm = normalizeHead(head)

            // если нашли в словаре — навешиваем метаданные
            const t = dict[norm]
            if (t) {
                token.attrJoin('class', 'dc')
                token.attrSet('data-key', norm)
                token.attrSet('data-type', t)
                if (rest && rest.trim().length) {
                    token.attrSet('data-value', rest.trim())
                }
            } else {
                // не нашли — всё равно помечаем как dc (для стилизации), но без data-*
                token.attrJoin('class', 'dc')
            }

            // Рендер с учётом любых уже добавленных атрибутов (markdown-it-attrs и пр.)
            return `<code${self.renderAttrs(token)}>${esc(after)}</code>`
        }

        // иначе — поведение по умолчанию
        if (typeof orig === 'function') return orig(tokens, idx, options, env, self)
        return `<code>${esc(src)}</code>`
    }
}
