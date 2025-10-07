import { buildDataAttrsString } from '../utils/blockAttrs'

type DataAttrs = Record<string, string>

const RE = /<div\s+class=["'](page-start|page-break)["']([^>]*)><\/div>\s*/gi

export function wrapIntoPages(html: string): string {
    const pages: Array<{ data: DataAttrs; html: string }> = []
    let cursor = 0
    let currentData: DataAttrs = {}   // активные атрибуты текущей страницы

    let m: RegExpExecArray | null
    while ((m = RE.exec(html))) {
        const before = html.slice(cursor, m.index) // контент до маркера
        const kind = m[1]                          // "page-start" | "pagebreak"
        const attrs = parseDataAttrs(m[2])

        if (kind === 'page-start') {
            // закончить предыдущую страницу, если есть контент
            if (pages.length > 0 || before.trim() !== '') {
                pages.push({ data: currentData, html: before })
            }
            // начать новую страницу с атрибутами из маркера
            currentData = attrs
        } else {
            // pagebreak: завершить страницу, атрибуты сохраняем для следующей
            pages.push({ data: currentData, html: before })
            // currentData не меняем
        }

        cursor = m.index + m[0].length
    }

    // хвост → последняя страница
    const tail = html.slice(cursor)
    pages.push({ data: currentData, html: tail })

    // выкидываем пустые страницы в начале/между маркерами
    const filtered = pages.filter((p, i) => !(i < pages.length - 1 && p.html.trim() === ''))

    return filtered.map((p, i) => renderPage(i + 1, p.data, p.html)).join('\n')
}

function parseDataAttrs(attrStr: string): DataAttrs {
    const out: DataAttrs = {}
    const re = /data-([a-z0-9_-]+)=["']([^"']*)["']/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(attrStr))) out[m[1].toLowerCase()] = m[2]
    return out
}

function renderPage(n: number, data: DataAttrs, inner: string): string {
    const ds = buildDataAttrsString(data)
    const style = data.bg ? ` style="background:${escapeHtml(data.bg)};"` : ''
    return `<section class="page" data-page="${n}"${ds}${style}>${inner}</section>`
}

function escapeHtml(s: string) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
