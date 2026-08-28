/**
 * 迷你 Markdown 渲染器（TS 化移植自 legacy.html renderMarkdown，行为保持一致）：
 * - 软换行合并为段落（<br>）
 * - 图片/链接相对路径按 base 解析（手册内路径已 URL 编码，如 图片和附件/image%2014.webp）
 * - 支持标题、有序/无序嵌套列表、代码块、行内代码、引用、分隔线、加粗
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderMarkdown(text: string, base: string): string {
  const encodedBase = encodeURI(base);

  function resolveUrl(u: string): string {
    const url = u.trim();
    if (/^(https?:|mailto:|data:)/i.test(url)) return url;
    return encodedBase + url.replace(/^\.\//, '');
  }

  function inline(s: string): string {
    s = escapeHtml(s);
    const codes: string[] = [];
    s = s.replace(/`([^`]+)`/g, (_m, c: string) => {
      codes.push(c);
      return `\u0001${codes.length - 1}\u0001`;
    });
    s = s.replace(/\\([\\`*_{}[\]()#+\-.!>~])/g, '$1');
    s = s.replace(
      /!\[([^\]]*)\]\(([^)\s]+)\)/g,
      (_m: string, alt: string, url: string) =>
        `<img src="${resolveUrl(url)}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy" />`,
    );
    s = s.replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_m: string, t: string, url: string) =>
        `<a href="${resolveUrl(url)}" target="_blank" rel="noopener">${t}</a>`,
    );
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\u0001(\d+)\u0001/g, (_m: string, idx: string) => `<code>${codes[+idx]}</code>`);
    return s;
  }

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  const listStack: string[] = [];
  const closeLists = () => {
    while (listStack.length) out.push(`</${listStack.pop()}>`);
  };

  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    if (inCode) {
      if (/^```\s*$/.test(line)) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
        inCode = false;
      } else {
        codeBuf.push(line);
      }
      i++;
      continue;
    }
    if (/^```/.test(line)) {
      closeLists();
      inCode = true;
      codeBuf = [];
      i++;
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      closeLists();
      i++;
      continue;
    }
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeLists();
      const lvl = Math.min(h[1].length, 3);
      out.push(`<h${lvl}>${inline(h[2].trim())}</h${lvl}>`);
      i++;
      continue;
    }
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      closeLists();
      out.push('<hr>');
      i++;
      continue;
    }
    const li = line.match(/^(\s*)(?:([-*+])|(\d+)[.)])\s+(.*)$/);
    if (li) {
      const level = li[1].length >= 2 ? 1 : 0;
      while (listStack.length > level + 1) out.push(`</${listStack.pop()}>`);
      if (listStack.length <= level) {
        const tag = li[3] ? 'ol' : 'ul';
        out.push(`<${tag}>`);
        listStack.push(tag);
      }
      out.push(`<li>${inline(li[4])}</li>`);
      i++;
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      closeLists();
      const quoteBuf: string[] = [];
      while (i < lines.length && /^>/.test(lines[i].trim()) && lines[i].trim()) {
        quoteBuf.push(inline(lines[i].trim().replace(/^>\s?/, '')));
        i++;
      }
      out.push(`<blockquote>${quoteBuf.join('<br>')}</blockquote>`);
      continue;
    }
    /* 普通段落：连续非空行合并（软换行转 <br>） */
    closeLists();
    const paraBuf: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      const t = l.trim();
      if (
        !t ||
        /^```/.test(l) ||
        /^(#{1,6})\s+/.test(t) ||
        /^(\*{3,}|-{3,}|_{3,})$/.test(t) ||
        /^(\s*)([-*+]|\d+[.)])\s+/.test(l) ||
        /^>/.test(t)
      )
        break;
      paraBuf.push(inline(t));
      i++;
    }
    out.push(`<p>${paraBuf.join('<br>')}</p>`);
  }
  closeLists();
  if (inCode && codeBuf.length) out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
  return out.join('\n');
}
