// Vanilla Vite preview. Reuses the shared core.
import './polyfills'
import { renderMarkdownToBody } from '../core/dfm-core'
import { wrapIntoPages } from '../core/page-chunker'
import { hydrateToc } from '../core/toc-hydrator'
import { applyI18n } from '../i18n'
import { normalizeBoolean } from '../utils/normalize-boolean'

const root = document.getElementById('app') as HTMLElement

// Собираем все .md/.markdown из /content (ленивая загрузка, HMR-совместимо)
const files = import.meta.glob('/content/**/*.{md,markdown}', {
    query: '?raw',
    import: 'default'
})

function resolveDocPath(): string {
    // приоритет: ?doc= → VITE_DOC → /content/index.md
    const urlDoc = new URLSearchParams(location.search).get('doc') || ''
    const envDoc = (import.meta.env.VITE_DOC as string | undefined) || ''
    let key =
        urlDoc ||
        envDoc ||
        '/content/index.md'

    // нормализуем к абсолютному пути под /content
    if (!key.startsWith('content/')) {
        key = '/content/' + key.replace(/^\.?\//, '')
    } else {
        key = "/" + key;
    }

    if (!files[key]) {
        console.warn('[DFM] Doc not found, falling back to /content/index.md:', key)
        key = '/content/index.md'
    }
    return key
}

function dirname(path: string): string {
    const i = path.lastIndexOf('/')
    return i >= 0 ? path.slice(0, i + 1) : '/'
}

function rewriteRelativeImageSrcs(scope: Element | Document, baseDir: string) {
    const imgs = scope.querySelectorAll<HTMLImageElement>('img[src]')
    imgs.forEach(img => {
        const src = img.getAttribute('src') || ''
        // интересуют только относительные пути ./  или ../  (и без протокола/слеша в начале)
        if (/^(?:\.{1,2}\/)/.test(src) || (!src.startsWith('/') && !/^[a-zA-Z]+:/.test(src))) {
            // собрать абсолютный путь относительно каталога md-файла
            const abs = new URL(src, `${location.origin}${baseDir}`).pathname
            img.setAttribute('src', abs)
        }
    })
}

async function loadCurrent(): Promise<{ source: string; docDir: string }> {
    const key = resolveDocPath()
    const loader = files[key] as () => Promise<string>
    const source = await loader()
    return { source, docDir: dirname(key) } // например: /content/guide/
}

async function renderCurrent() {
    const { source, docDir } = await loadCurrent()

    const { bodyHtml, frontmatter } = renderMarkdownToBody(source)

    root.innerHTML = wrapIntoPages(bodyHtml, {
        showPageNumbers: normalizeBoolean(frontmatter['show-page-numbers']) ?? false,
        contentsPageNumber: String(frontmatter['contents-page-number'] ?? ''),
        footnoteDefault: (frontmatter['footnote'] as any) // 'auto' | 'none' | string
    })

    // 🔧 починить относительные изображения относительно каталога MD
    rewriteRelativeImageSrcs(root, docDir)

    const title = String(frontmatter.title ?? '').trim() || 'Preview';
    const lang = String(frontmatter.lang ?? 'en').toLowerCase() === 'ru' ? 'ru' : 'en';
    const pageSize = String(frontmatter.size ?? 'a4').trim() || 'a4';

    // page size
    document.querySelector('.content')?.setAttribute('data-size', pageSize);

    // язык на <html>
    document.title = `DFM Preview - ${title}`;
    document.documentElement.setAttribute('lang', lang);

    // i18n для всего документа (или можно root — как тебе удобнее)
    applyI18n(document, { defaultLang: lang })

    // TOC-гидратор — уже после вставки/переводов
    hydrateToc(root)
}

// первый рендер
await renderCurrent()

// HMR: перерендер при изменении любого файла из /content
if (import.meta.hot) {
    import.meta.hot.accept(Object.keys(files), async () => {
        await renderCurrent()
    })
}
