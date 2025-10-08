import { isFenceClose } from './fence'

/**
 * Собирает линии тела от startLine+1 до строки с закрывающим забором
 * НЕ срезает ведущие пробелы, НЕ триммит строки, ГАРАНТИРУЕТ финальный \n.
 * Возвращает { rawBody, nextLine } — nextLine указывает на строку закрывающего забора.
 */
export function collectBodyRaw(
    state: any,
    startLine: number,
    endLine: number,
    fenceLen: number
): { rawBody: string; nextLine: number } {
    let next = startLine + 1
    const out: string[] = []
    while (next < endLine) {
        const s2 = state.bMarks[next]            // ❗️без + tShift — сохраняем отступы
        const e2 = state.eMarks[next]
        const ln = state.src.slice(s2, e2)
        if (isFenceClose(ln, fenceLen)) break
        out.push(ln)
        next++
    }
    // Важный нюанс для markdown-it: финальный перевод строки помогает корректно закрыть списки
    if (out.length === 0 || !out[out.length - 1].endsWith('\n')) out.push('')
    return { rawBody: out.join('\n'), nextLine: next }
}
