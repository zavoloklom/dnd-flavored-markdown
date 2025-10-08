import { escapeHtml } from '../utils/escape-html';
import { buildDataAttrsString } from '../utils/blockAttrs'

type DataAttrs = Record<string, string>
interface Options {
    showPageNumbers?: boolean            // фронтматтер: show-page-numbers
    numberFormat?: (n: number) => string // опционально, если хочешь кастомную авто-форматную функцию
}

const RE = /<div\s+class=["'](page-start|page-break)["']([^>]*)><\/div>\s*/gi

export function wrapIntoPages(html: string, opts: Options = {}): string {
    const pages: Array<{ data: DataAttrs; html: string }> = []
    let cursor = 0
    let currentData: DataAttrs = {}   // активные data-* атрибуты страницы (layout и пр.)

    let m: RegExpExecArray | null
    while ((m = RE.exec(html))) {
        const before = html.slice(cursor, m.index)
        const kind = m[1]                               // "page-start" | "page-break"
        const attrs = parseDataAttrs(m[2])              // data-*

        if (kind === 'page-start') {
            // закрыть предыдущую страницу (если есть контент)
            if (pages.length > 0 || before.trim() !== '') {
                pages.push({ data: currentData, html: before })
            }
            // начать новую страницу с атрибутами из маркера
            currentData = attrs
        } else {
            // page-break — завершить страницу, атрибуты сохраняются для следующей
            pages.push({ data: currentData, html: before })
            // currentData не меняем
        }
        cursor = m.index + m[0].length
    }

    // хвост в последнюю страницу
    const tail = html.slice(cursor)
    pages.push({ data: currentData, html: tail })

    // убрать технические пустышки посреди документа
    const filtered = pages.filter((p, i) => !(i < pages.length - 1 && p.html.trim() === ''))

    // глобальная опция
    const showGlobal = !!opts.showPageNumbers
    const fmt = opts.numberFormat ?? ((n: number) => String(n))

    // собрать выходной HTML
    let auto = 1
    return filtered.map((p, i) => {
        // 1) вычисляем «отображаемый» номер для этой страницы
        // приоритет: data-page-number (из ::: page {...}) → авто (строка)
        const override = p.data['page-number']         // может быть любой строкой
        const display = (override !== undefined && override !== '')
            ? String(override)
            : fmt(auto)

        // 2) решить, показывать ли футер: глобально ИЛИ локально
        const showLocal = normalizeBool(p.data['show-page-number'])
        const show = showGlobal || showLocal

        const html = renderPage(i + 1, p.data, p.html, display, show)
        auto++ // авто-счётчик всё равно бежит последовательно
        return html
    }).join('\n')
}

function parseDataAttrs(attrStr: string): DataAttrs {
    const out: DataAttrs = {}
    const re = /data-([a-z0-9_-]+)=["']([^"']*)["']/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(attrStr))) out[m[1].toLowerCase()] = m[2]
    return out
}

function renderPage(index1: number, data: DataAttrs, inner: string, pageNumberText: string, showNumber: boolean): string {
    // не дублируем специальные ключи при рендере data-* (они идут отдельно)
    const { ['page-number']: _pn, ['show-page-number']: _sp, ...rest } = data
    const ds = buildDataAttrsString(rest)
    const footer = showNumber
        ? `<div class="page-number" aria-hidden="true">${escapeHtml(pageNumberText)}</div>`
        : ''
    // меняем data-page → data-page-number (как просил)
    return `<section class="page" data-page-number="${escapeHtml(pageNumberText)}"${ds}>${inner}${footer}</section>`
}

function normalizeBool(v: string | undefined): boolean {
    if (v == null) return false
    const s = String(v).trim().toLowerCase()
    return s === '1' || s === 'true' || s === 'yes' || s === 'on'
}
