import type { ReactNode } from 'react';

/**
 * 数据文案的行内强调渲染：把 `**关键词**` 标记解析为品牌强调色加粗。
 * 标记约定仅供 src/data/ 文案使用（见 types.ts 字段注释）；未闭合的 `**` 按原文展示。
 */
export function EmText({
  text,
  /** 强调片段样式类；深色/彩色底上的文案可传入浅色变体 */
  accentClass = 'font-semibold text-accent',
}: {
  text: string;
  accentClass?: string;
}) {
  if (!text.includes('**')) return <>{text}</>;

  const nodes: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <strong key={key++} className={accentClass}>
        {match[1]}
      </strong>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
