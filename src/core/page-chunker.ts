// Split rendered HTML into <section class="page"> chunks by <div class="page-break"></div>.
// The marker is removed from output. If it appears first (with no content before),
// we do NOT emit an empty first page.

const BREAK_RE = /<div\s+class=["']page-break["']><\/div>\s*/gi

export function wrapIntoPages(html: string): string {
    const pages: string[] = []
    let cursor = 0
    let m: RegExpExecArray | null

    while ((m = BREAK_RE.exec(html))) {
        const before = html.slice(cursor, m.index)
        const isLeading = pages.length === 0 && before.trim() === ''
        if (!isLeading) pages.push(before)
        cursor = m.index + m[0].length
    }
    const tail = html.slice(cursor)
    pages.push(tail)

    return pages
        .map((chunk, i) => `<section class="page" data-page="${i + 1}">${chunk}</section>`)
        .join('\n')
}
