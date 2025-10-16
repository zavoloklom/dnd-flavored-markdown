// src/core/toc-hydrator.ts

export interface TocHydratorOptions {
    containerSelector?: string        // default '.toc'
    pageSectionSelector?: string      // default 'section.page'
    pageAttr?: string                 // default 'data-page-count'
    missingLabel?: string             // default '?'
}

export function hydrateToc(
    root: Document | Element = document,
    opts: TocHydratorOptions = {}
): void {
    const containerSel = opts.containerSelector ?? '.toc'
    const pageSel = opts.pageSectionSelector ?? 'section.page'
    const pageAttr = opts.pageAttr ?? 'data-page-count'
    const missing = opts.missingLabel ?? '?'

    const scopeQuery = (sel: string) =>
        (root instanceof Document ? root : root).querySelectorAll(sel)

    const tocs = scopeQuery(containerSel) as NodeListOf<HTMLElement>
    tocs.forEach(toc => {
        const scope: ParentNode = toc;
        const items = scope.querySelectorAll<HTMLLIElement>('li')

        items.forEach(li => {
            const a = li.querySelector<HTMLAnchorElement>('a[href^="#"]')
            if (!a) return

            const id = extractId(a.getAttribute('href')!)
            const target = id ? getByIdWithin(root, id) : null
            const page = target?.closest<HTMLElement>(pageSel)
            const pageNum = page?.getAttribute(pageAttr) || missing

            if (a.classList.contains('toc__row')) {
                const pageSpan = a.querySelector<HTMLElement>('.toc__page')
                if (pageSpan) pageSpan.textContent = pageNum
                a.classList.toggle('is-missing', !target)
                return
            }

            if (pageNum !== missing) {
                a.setAttribute('href', `#p${pageNum}`)
            }

            const row = a
            row.classList.add('toc__row')

            const textSpan = document.createElement('span')
            textSpan.className = 'toc__text'
            textSpan.textContent = getPlainText(row)

            const dotsSpan = document.createElement('span')
            dotsSpan.className = 'toc__dots'
            dotsSpan.setAttribute('aria-hidden', 'true')

            const pageSpan = document.createElement('span')
            pageSpan.className = 'toc__page'
            pageSpan.textContent = pageNum

            clearChildren(row)
            row.appendChild(textSpan)
            row.appendChild(dotsSpan)
            row.appendChild(pageSpan)

            row.classList.toggle('is-missing', !target)
        })
    })
}

function extractId(href: string): string | null {
    const s = (href || '').trim()
    if (!s || s[0] !== '#') return null
    try { return decodeURIComponent(s.slice(1)) } catch { return s.slice(1) }
}

/** Ищем #id внутри переданного root (Document или Element). */
function getByIdWithin(root: Document | Element, id: string): Element | null {
    // сначала пробуем ограниченный поиск внутри root
    const sel = `#${cssEscape(id)}`
    if (!(root instanceof Document)) {
        return root.querySelector(sel)
    }
    // если root — Document, берем напрямую
    return root.getElementById(id)
}

function cssEscape(s: string): string {
    // используем нативный CSS.escape где есть
    const esc = (window as any).CSS?.escape
    if (typeof esc === 'function') return esc(s)
    // простая подстановка для распространенных символов
    return String(s).replace(/([ !"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~])/g, '\\$1')
}

function getPlainText(el: Element): string {
    const txt = el.textContent ?? ''
    return txt.replace(/\s+/g, ' ').trim()
}

function clearChildren(el: Element): void {
    while (el.firstChild) el.removeChild(el.firstChild)
}
