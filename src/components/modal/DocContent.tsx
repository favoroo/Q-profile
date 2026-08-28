import { useEffect, useState } from 'react';
import type { DocResource } from '../../data/types';
import { renderMarkdown } from '../../lib/markdown';

type DocState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; html: string };

/**
 * 文档弹窗：fetch public/docs/ 下手册 Markdown → renderMarkdown → 渲染。
 * 修复旧站「文档内容未找到」（内嵌数据块缺失）的问题。
 */
export function DocContent({ doc }: { doc: DocResource }) {
  const [state, setState] = useState<DocState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetch(doc.url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        setState({ status: 'ok', html: renderMarkdown(text, doc.base) });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : '未知错误',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [doc, attempt]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center gap-3 border-b border-black/[0.08] py-[18px] pr-16 pl-8 max-sm:py-3.5 max-sm:pl-5">
        <span className="flex-none rounded-full bg-accent/[0.1] px-2.5 py-[3px] text-[11px] font-semibold tracking-[0.06em] text-accent">
          开发手册
        </span>
        <span className="text-[17px] font-bold tracking-[-0.01em]">{doc.title}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 pt-7 pb-10 [-webkit-overflow-scrolling:touch] max-sm:px-[18px] max-sm:pt-5 max-sm:pb-8">
        <div className="md-view">
          {state.status === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-[13.5px] text-ink-3">
              <span className="lb-spinner" />
              <span>正在加载手册内容…</span>
            </div>
          )}
          {state.status === 'error' && (
            <div className="md-error">
              手册加载失败（{state.message}）。
              <br />
              <button type="button" onClick={() => setAttempt((n) => n + 1)}>
                重试
              </button>
            </div>
          )}
          {state.status === 'ok' && (
            <div dangerouslySetInnerHTML={{ __html: state.html }} />
          )}
        </div>
      </div>
    </div>
  );
}
