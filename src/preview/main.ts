// Vanilla Vite preview. Reuses the shared core.
import './polyfills';
import { renderMarkdownToBody } from '../core/dfm-core';
import { wrapIntoPages } from '../core/page-chunker';
import { hydrateToc } from '../core/toc-hydrator';

// Import markdown as raw for HMR reloads
// Vite supports the ?raw query to import file contents as string.
import doc from '/content/index.md?raw';

const root = document.getElementById('app') as HTMLElement

function isTrue(v: unknown) {
    return v === true || String(v ?? '').trim().toLowerCase() === 'true'
}

function render(source: string) {
    const { bodyHtml, frontmatter } = renderMarkdownToBody(source)

    root.innerHTML = wrapIntoPages(bodyHtml, {
        showPageNumbers: isTrue(frontmatter['show-page-numbers']),
        contentsPageNumber: String(frontmatter['contents-page-number'])
    })

    // пост-проход: проставим точки и номера страниц в .toc
    hydrateToc(root)
}

render(doc);

if (import.meta.hot) {
    import.meta.hot.accept('/content/index.md?raw', (m) => render(m!.default))
}
