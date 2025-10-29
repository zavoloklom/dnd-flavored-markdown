import {escapeHtml} from '../utils/escape-html'
import {buildAttrsString} from '../utils/block-attrs'
import {normalizeBoolean} from '../utils/normalize-boolean'

type DataAttrs = Record<string, string>

interface Options {
    contentsPageNumber?: string
    showPageNumbers?: boolean
    numberFormat?: (n: number) => string
    /** Глобальный дефолт футера: 'auto' | 'none' | строка */
    footnoteDefault?: 'auto' | 'none' | string
}

const RE = /<div\s+class=["'](page-start|page-break)["']([^>]*)><\/div>\s*/gi

export function wrapIntoPages(html: string, opts: Options = {}): string {
    const pages: Array<{ data: DataAttrs; html: string }> = []
    let cursor = 0
    let currentData: DataAttrs = {}

    let m: RegExpExecArray | null
    while ((m = RE.exec(html))) {
        const before = html.slice(cursor, m.index)
        const kind = m[1]                 // "page-start" | "page-break"
        const attrs = parseDataAttrs(m[2])

        if (kind === 'page-start') {
            if (pages.length > 0 || before.trim() !== '') {
                pages.push({data: currentData, html: before})
            }
            currentData = attrs
        } else {
            pages.push({data: currentData, html: before})
            // currentData сохраняем
        }
        cursor = m.index + m[0].length
    }

    const tail = html.slice(cursor)
    pages.push({data: currentData, html: tail})

    const filtered = pages.filter((p, i) => !(i < pages.length - 1 && p.html.trim() === ''))

    // ── Глобальные опции
    const showGlobal = !!opts.showPageNumbers
    const fmt = opts.numberFormat ?? ((n: number) => String(n))
    const contentsPageNumber = opts.contentsPageNumber || null
    const footnoteDefault = normalizeFootnoteSetting(opts.footnoteDefault)

    // ── Вычислим «эффективную» главу для каждой страницы и занесём в массив
    const pageChapters: string[] = []
    let lastChapter: string | '' = ''

    for (let i = 0; i < filtered.length; i++) {
        const p = filtered[i]
        const declared = (p.data['chapter'] ?? '').trim()        // из ::: page {chapter="..."}
        const foundOnPage = extractFirstChapterText(p.html)       // из <div data-kind="chapter" ...>

        let effective = lastChapter

        if (declared) {
            // явное указание на странице — приоритетнее всего
            effective = declared
            lastChapter = declared
        } else if (foundOnPage) {
            // глава встречена в самой странице — тоже обновляем «текущую»
            effective = foundOnPage
            lastChapter = foundOnPage
        }
        // иначе effective = lastChapter (перетаскиваем вперёд)

        pageChapters.push(effective)
    }

    // ── Сборка выходного HTML
    let auto = 1
    return filtered.map((p, i) => {
        // иконка
        const icon = p.data['icon'] || undefined;

        // отображаемый номер
        const override = p.data['page-number']
        const display = (override !== undefined && override !== '') ? String(override) : fmt(auto)

        // показывать номер?
        const showLocal = normalizeBoolean(p.data['show-page-number'])
        const show = (showLocal !== null) ? showLocal : showGlobal

        // глава этой страницы
        const chapterText = pageChapters[i]

        // итоговый текст футера (локальное всегда сильнее глобального)
        const localFoot = normalizeFootnoteSetting(p.data['footnote'])
        const footText = selectFootnoteText(localFoot, footnoteDefault, chapterText)

        const htmlOut = renderPage(
            i + 1,
            p.data,
            p.html,
            display,
            show,
            footText,
            contentsPageNumber,
            chapterText,
            icon
        )

        auto++
        return htmlOut
    }).join('\n')
}

function parseDataAttrs(attrStr: string): DataAttrs {
    const out: DataAttrs = {}
    const re = /data-([a-z0-9_-]+)=["']([^"']*)["']/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(attrStr))) out[m[1].toLowerCase()] = m[2]
    return out
}

/** Ищет первую главу в HTML страницы и возвращает «A | B» или только «B». */
function extractFirstChapterText(html: string): string {
    // Найдём первый <div class="chapter"...>...</div>
    const chapterRegExp = /<div\b(?=[^>]*\bdata-kind=(?:"|')chapter["'])[^>]*\bdata-value=["']([^"']*)["'][^>]*>/i.exec(html)
    if (!chapterRegExp) return ''
    const chapter = chapterRegExp[1];

    return chapter || ''
}

/** Убираем теги и пробелы внутри главы (текст внутри subtitle/title). */
function cleanText(s: string): string {
    const noTags = s.replace(/<[^>]*>/g, '')
    return noTags.replace(/\s+/g, ' ').trim()
}

/** 'auto' | 'none' | строка → нормализованное значение */
function normalizeFootnoteSetting(v: string | undefined | null | Options['footnoteDefault']): {
    kind: 'auto' | 'none' | 'text';
    text?: string
} | null {
    if (v == null) return null
    const s = String(v).trim()
    const sl = s.toLowerCase()
    if (sl === 'auto') return {kind: 'auto'}
    if (sl === 'none') return {kind: 'none'}
    return {kind: 'text', text: s}
}

/** Выбор итогового текста футера по локальному/глобальному значению и главе. */
function selectFootnoteText(
    local: ReturnType<typeof normalizeFootnoteSetting>,
    global: ReturnType<typeof normalizeFootnoteSetting>,
    chapter: string
): string {
    const pick = (x: ReturnType<typeof normalizeFootnoteSetting>) => {
        if (!x) return ''
        if (x.kind === 'none') return ''
        if (x.kind === 'auto') return chapter || ''
        return x.text ?? ''
    }
    return local ? pick(local) : pick(global)
}

function renderPage(
    pageIndex: number,
    data: DataAttrs,
    inner: string,
    pageNumberText: string,
    showNumber: boolean,
    footnoteText: string,
    contentsPageNumber: string | null,
    chapterText?: string,
    icon?: string
): string {
    // не дублируем специальные ключи
    const {
        ['page-number']: _pn,
        ['show-page-number']: _sp,
        ['footnote']: _fn,
        ['chapter']: _ch,
        ['icon']: _icon,
        ...rest
    } = data

    const iconBlock = icon
        ? `<div class="icon" aria-hidden="true"><img alt="icon" src=${icon}></div>`
        : '';

    const footnote = footnoteText
        ? `<div class="footnote" aria-hidden="true">${escapeHtml(footnoteText)}</div>`
        : ''

    const pageNumberBlock = contentsPageNumber
        ? `<a class="page-number" aria-hidden="true" href="#p${contentsPageNumber}">${escapeHtml(pageNumberText)}</a>`
        : `<div class="page-number" aria-hidden="true">${escapeHtml(pageNumberText)}</div>`

    const pageNumber = showNumber ? pageNumberBlock : ''

    // data-атрибут с главой (если есть)
    const dataChapterAttr = chapterText && chapterText.trim().length
        ? ` data-chapter="${escapeAttr(chapterText)}"`
        : ''

    const dataAttributes = buildAttrsString({
        classes: ['page'],
        style: '',
        data: Object.assign(rest, { "page-count": String(pageIndex), "page-number": escapeHtml(pageNumberText)})
    })

    return `<section id="p${pageIndex}"${dataAttributes}${dataChapterAttr}>${inner}${iconBlock}${footnote}${pageNumber}</section>`
}

function escapeAttr(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}
