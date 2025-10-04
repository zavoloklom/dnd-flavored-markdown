// Vanilla Vite preview. Reuses the shared core.
import './polyfills';
import { renderMarkdownToBody } from '../core/dfm-core';

// Import markdown as raw for HMR reloads
// Vite supports the ?raw query to import file contents as string.
import doc from '/content/index.md?raw'

const root = document.getElementById('app') as HTMLElement

function render(source: string) {
    const { bodyHtml } = renderMarkdownToBody(source)
    root.innerHTML = bodyHtml
}

// Initial render
render(doc)

// HMR: re-render on changes to the .md file
if (import.meta.hot) {
    import.meta.hot.accept('/content/index.md?raw', (mod: any) => {
        render(mod?.default ?? '')
    })
}
