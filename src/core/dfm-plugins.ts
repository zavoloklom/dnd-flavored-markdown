import anchor from 'markdown-it-anchor';
import slugify from '@sindresorhus/slugify';

import { useFlowBreaks } from '../plugins/flow-breaks';
import { usePage } from '../plugins/page';
import { useStatBlock } from '../plugins/stat-block';
import { useStatBlockSections } from '../plugins/stat-block-sections';
import { useAbilityScores } from '../plugins/abilityscores';
import { useContainer } from '../plugins/container';
import { useBlockquoteDescription } from '../plugins/blockquote-description';
import { useDcInline } from '../plugins/dc';
import { useChapter } from '../plugins/chapter';
import { useHyphenation } from "../plugins/hyphenation";

import type MarkdownIt from 'markdown-it';
import type { GrayMatterFile } from "gray-matter";

export function applyDfmPlugins(md: MarkdownIt, fm: GrayMatterFile<string>) {
    useFlowBreaks(md);
    usePage(md);
    useStatBlock(md);
    useStatBlockSections(md);
    useAbilityScores(md);
    useBlockquoteDescription(md);
    useDcInline(md);
    useChapter(md);

    useHyphenation(md, fm.data.lang);

    /** Must be last **/
    useContainer(md);

    md.use(anchor, { slugify: s => slugify(s, {transliterate: false}) });
}
