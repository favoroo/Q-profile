import type { DocKey, DocResource } from './types';
import { withBase } from '../lib/asset';

/**
 * Agent 开发手册（Markdown）。
 * 旧站此处曾因内嵌 <script type="text/plain"> 数据块缺失导致「文档内容未找到」，
 * 新版统一改为 fetch public/docs/ 下的 Markdown 文件，dev 与线上均可正常加载。
 */
export const DOCS: Record<DocKey, DocResource> = {
  'trans-doc': {
    title: '翻译 Agent 开发手册',
    url: withBase('/docs/trans-agent/manual.md'),
    base: withBase('/docs/trans-agent/'),
  },
  'docs-doc': {
    title: '资料问答 Agent 开发手册',
    url: withBase('/docs/qa-agent/manual.md'),
    base: withBase('/docs/qa-agent/'),
  },
};

