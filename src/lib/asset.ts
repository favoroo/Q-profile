/**
 * 静态资源路径适配工具：
 * 自动根据 Vite 的 import.meta.env.BASE_URL 处理相对/绝对路径，
 * 保证在 GitHub Pages 二级路径（如 /Q-profile/）和根域名（/）下均能正常加载资源。
 */
export function withBase(path: string): string {
  if (!path) return path;
  if (/^(https?:|mailto:|data:|#|blob:)/i.test(path)) return path;
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
}

/**
 * 由项目配图的 WebP 主图路径派生 srcset，
 * 命名约定：同目录存在 `-800w` 小图变体。
 * width 为主图实际像素宽度（默认 1376，画廊截图约 1920）。
 */
export function projectImageSrcSet(path: string, width = 1376): string {
  const small = path.replace(/\.webp$/, '-800w.webp');
  if (small === path) return '';
  return `${small} 800w, ${path} ${width}w`;
}
