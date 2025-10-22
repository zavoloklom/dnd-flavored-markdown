// utils/block-attrs.ts
import { escapeHtml } from './escape-html'

export interface ParsedBlockAttrs {
    cleanedTail: string
    /** то, что пойдёт в data-*, уже нормализовано в kebab-case */
    data: Record<string, string>
    /** дополнительные CSS-классы из {class="..."} или {classes="..."} */
    classes: string[]
    /** строка для style="..." если задано в {...} */
    style?: string
}

/** key → kebab-case (camel/snake → kebab, lower) */
function toKebab(s: string): string {
    return s
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[_\s]+/g, '-')
        .toLowerCase()
}

export function parseCurlyDataAttrs(tail: string): ParsedBlockAttrs {
    const m = /\{([^}]*)\}\s*$/.exec(tail)
    if (!m) return { cleanedTail: tail, data: {}, classes: [] }

    const inside = m[1]
    const cleanedTail = tail.slice(0, m.index).trim()

    const data: Record<string, string> = {}
    const classes: string[] = []
    let style: string | undefined

    // tokens: key=value | key="with spaces" | key='with spaces'
    // keys: letters/digits/_-
    const re = /([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'}]+))/g
    let mm: RegExpExecArray | null
    while ((mm = re.exec(inside))) {
        const rawKey = mm[1]!
        const valRaw = (mm[2] ?? mm[3] ?? mm[4] ?? '').trim()
        const key = toKebab(rawKey)

        if (key === 'class' || key === 'classes') {
            // поддержим разделители пробел/запятая/точка с запятой
            valRaw.split(/[\s,;]+/).forEach(c => {
                const name = c.trim()
                if (name) classes.push(name)
            })
            continue
        }
        if (key === 'style') {
            if (valRaw) style = valRaw
            continue
        }
        // всё остальное — в data-*
        if (key) data[key] = valRaw
    }

    return { cleanedTail, data, classes, style }
}

/** Собрать строку атрибутов: class + style + data-* */
export function buildAttrsString(opts: {
    classes?: string[]
    style?: string
    data?: Record<string, string>
}): string {
    const parts: string[] = []

    if (opts.classes?.length) {
        const cls = Array.from(new Set(opts.classes.filter(Boolean)));
        parts.push(` class="${escapeHtml(cls.join(' '))}"`)
    }
    if (opts.style && opts.style.trim()) {
        parts.push(` style="${escapeHtml(opts.style)}"`)
    }
    const data = opts.data ?? {}
    for (const [k, v] of Object.entries(data)) {
        parts.push(` data-${escapeHtml(k)}="${escapeHtml(v)}"`)
    }
    return parts.join('')
}
