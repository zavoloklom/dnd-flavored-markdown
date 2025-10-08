import type MarkdownIt from 'markdown-it'

export function useBlockquoteDescription(md: MarkdownIt) {
    // Сохраняем оригинальные рендереры (если кто-то уже переопределял)
    const origOpen  = md.renderer.rules.blockquote_open
    const origClose = md.renderer.rules.blockquote_close
    const renderTok = (tokens:any[], idx:number, opts:any, env:any, self:any) =>
        self.renderToken(tokens, idx, opts)

    md.renderer.rules.blockquote_open = (tokens, idx, opts, env, self) => {
        const inner = origOpen
            ? origOpen(tokens, idx, opts, env, self)
            : renderTok(tokens, idx, opts, env, self)
        return `<div class="description">` + inner
    }

    md.renderer.rules.blockquote_close = (tokens, idx, opts, env, self) => {
        const inner = origClose
            ? origClose(tokens, idx, opts, env, self)
            : renderTok(tokens, idx, opts, env, self)
        return inner + `</div>\n`
    }
}
