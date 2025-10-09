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
    if (!key.startsWith('/content/')) {
        key = '/content/' + key.replace(/^\.?\//, '')
    }

    if (!files[key]) {
        console.warn('[DFM] Doc not found, falling back to /content/index.md:', key)
        key = '/content/index.md'
    }
    return key
}

async function loadCurrentSource(): Promise<string> {
    const key = resolveDocPath()
    const loader = files[key]!
    const source = (await loader()) as unknown as string
    return source
}

async function renderCurrent() {
    const source = await loadCurrentSource()

    const { bodyHtml, frontmatter } = renderMarkdownToBody(source)

    root.innerHTML = wrapIntoPages(bodyHtml, {
        showPageNumbers: normalizeBoolean(frontmatter['show-page-numbers']) ?? false,
        contentsPageNumber: String(frontmatter['contents-page-number'] ?? '')
    })

    const title = String(frontmatter.title ?? '').trim() || 'Preview';
    const lang = String(frontmatter.lang ?? 'en').toLowerCase() === 'ru' ? 'ru' : 'en';

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
