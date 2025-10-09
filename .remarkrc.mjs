import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'

export default {
    plugins: [
        remarkParse,
        remarkDirective,
        remarkGfm,
        [remarkStringify, { bullet: '-', fences: true, listItemIndent: 'one', maxWidth: 120  }]
    ]
}
