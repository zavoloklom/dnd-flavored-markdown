// Мини-i18n: заменяем текст узлов с data-i18n-key по словарю.
// Язык берём из ближайшего [lang] или [data-lang]; иначе — defaultLang.

import en from './en.json'
import ru from './ru.json'

export type Locale = 'en' | 'ru'
export type Dict = Record<string, string>
const DICTS: Record<Locale, Dict> = { en, ru }

export interface I18nOptions {
    /** Язык по умолчанию (например, из фронтматтера). */
    defaultLang?: Locale
    /** Селектор узлов, подлежащих переводу. Обычно `[data-i18n-key]`. */
    selector?: string
}

/** Применить переводы к поддереву DOM. */
export function applyI18n(root: Document | Element, opts: I18nOptions = {}): void {
    const selector = opts.selector ?? '[data-i18n-key]'
    const defaultLang: Locale = normalizeLocale(
        opts.defaultLang ?? (getLangOn(root) as Locale) ?? 'en'
    )

    const nodes = root.querySelectorAll<HTMLElement>(selector)
    nodes.forEach(node => {
        const lang = normalizeLocale(resolveNodeLocale(node, defaultLang))
        const dict = DICTS[lang] ?? DICTS['en']
        const key = node.getAttribute('data-i18n-key') || ''
        if (!key) return

        const translated = dict[key]
        if (translated == null) return // нет ключа — ничего не меняем

        // Заменяем ТОЛЬКО текстовое содержимое текущего узла
        node.textContent = translated
    })
}

/** Определить язык для узла: ближайший [lang] или [data-lang], иначе defaultLang. */
export function resolveNodeLocale(node: Element, defaultLang: Locale = 'en'): Locale {
    const carrier = node.closest<HTMLElement>('[lang], [data-lang]')
    const found = carrier?.getAttribute('lang') || carrier?.getAttribute('data-lang')
    return normalizeLocale((found as Locale) ?? defaultLang)
}

/** Взять lang с текущего узла, если это документ или элемент с атрибутом. */
function getLangOn(root: Document | Element): string | null {
    if (root instanceof Document) return root.documentElement.getAttribute('lang')
    return root.getAttribute('lang') || root.getAttribute('data-lang')
}

function normalizeLocale(v: string | null | undefined): Locale {
    const s = String(v ?? '').trim().toLowerCase()
    return (s === 'ru') ? 'ru' : 'en'
}
