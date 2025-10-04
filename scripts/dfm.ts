#!/usr/bin/env node
// Single CLI that calls the shared core to produce HTML.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'
import { watch as fsWatch } from 'node:fs'
import { Command } from 'commander'
import { renderMarkdownToBody, buildHtmlDocument } from '../src/core/dfm-core'

async function inlineThemeCss(themeDir: string) {
    const [screen, print] = await Promise.all([
        readFile(join(themeDir, 'screen.css'), 'utf8'),
        readFile(join(themeDir, 'print.css'), 'utf8')
    ])
    return { screen, print }
}

async function renderOnce(input: string, opts: {
    output: string
    title?: string
    inlineCss?: boolean
    themeDir: string
}) {
    const src = await readFile(input, 'utf8')
    const { bodyHtml, frontmatter } = renderMarkdownToBody(src)
    const docTitle = opts.title || (frontmatter['title'] as string) || input

    const css = opts.inlineCss
        ? { inline: await inlineThemeCss(opts.themeDir) }
        : { hrefs: { screen: './themes/default/screen.css', print: './themes/default/print.css' } }

    const html = buildHtmlDocument({ title: docTitle, bodyHtml, css })
    const outAbs = resolve(opts.output)
    await mkdir(dirname(outAbs), { recursive: true })
    await writeFile(outAbs, html, 'utf8')
    console.log(`Rendered: ${outAbs}`)
}

const program = new Command()
program.name('dfm').description('D&D-Flavored Markdown CLI')

program.command('build')
    .argument('<input.md>', 'Markdown file')
    .option('-o, --output <file>', 'Output HTML file', 'dist/index.html')
    .option('-t, --title <title>', 'Document title (overrides frontmatter)')
    .option('--inline-css', 'Inline theme CSS into HTML', false)
    .option('--theme-dir <dir>', 'Theme directory', 'themes/default')
    .action(async (input: string, options) => {
        await renderOnce(input, {
            output: options.output,
            title: options.title,
            inlineCss: !!options.inlineCss,
            themeDir: options.themeDir
        })
    })

program.command('watch')
    .argument('<input.md>', 'Markdown file')
    .option('-o, --output <file>', 'Output HTML file', 'dist/index.html')
    .option('-t, --title <title>', 'Document title (overrides frontmatter)')
    .option('--inline-css', 'Inline theme CSS into HTML', false)
    .option('--theme-dir <dir>', 'Theme directory', 'themes/default')
    .action(async (input: string, options) => {
        await renderOnce(input, {
            output: options.output,
            title: options.title,
            inlineCss: !!options.inlineCss,
            themeDir: options.themeDir
        })
        console.log('Watching for changes…')
        fsWatch(input, { persistent: true }, async (evtType) => {
            if (evtType === 'change') {
                try {
                    await renderOnce(input, {
                        output: options.output,
                        title: options.title,
                        inlineCss: !!options.inlineCss,
                        themeDir: options.themeDir
                    })
                } catch (e) { console.error(e) }
            }
        })
    })

program.parseAsync()
