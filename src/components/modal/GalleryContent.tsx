import { useCallback, useEffect, useState } from 'react';
import type { GalleryImage } from '../../data/types';
import { projectImageSrcSet } from '../../lib/asset';
import { Icon } from '../ui/icons';

/** 画廊内容区高度：对齐 2:1 左右的工具截图，避免面板随图片切换跳动。 */
const STAGE_ASPECT = 'aspect-[2/1] max-sm:aspect-[16/10]';

/** 图片画廊弹窗：黑底大图 + 左右循环切换 + 键盘 ←/→，底部显示名称与计数。 */
export function GalleryContent({
  images,
  startIndex,
}: {
  images: GalleryImage[];
  startIndex: number;
}) {
  const [active, setActive] = useState(() => Math.min(Math.max(startIndex, 0), images.length - 1));
  const [loading, setLoading] = useState(true);

  const go = useCallback(
    (delta: number) => {
      setLoading(true);
      setActive((i) => (i + delta + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go]);

  if (!images.length) return null;
  const current = images[active];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-black">
      <div className={`relative flex w-full flex-none items-center justify-center overflow-hidden ${STAGE_ASPECT}`}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <span className="lb-spinner-dark" />
          </div>
        )}
        <img
          key={current.src}
          src={current.src}
          srcSet={projectImageSrcSet(current.src, current.width) || undefined}
          sizes="(max-width: 767px) 96vw, 1280px"
          alt={current.alt}
          onLoad={() => setLoading(false)}
          decoding="async"
          className="block h-full w-full object-contain"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="上一张"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 z-20 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-none bg-white/85 text-ink shadow-[0_4px_14px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.08] hover:text-accent active:scale-95"
            >
              <Icon name="chevron" className="h-4 w-4 rotate-180" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 z-20 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-none bg-white/85 text-ink shadow-[0_4px_14px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.08] hover:text-accent active:scale-95"
            >
              <Icon name="chevron" className="h-4 w-4" strokeWidth={2} />
            </button>
          </>
        )}
      </div>
      <div className="flex flex-none items-center justify-between gap-4 border-t border-white/10 px-5 py-3">
        <span className="truncate text-[13.5px] font-medium text-white">
          {current.caption}
          <span className="ml-2 font-normal text-white/55">EV Kit 2 高压测量配套工具</span>
        </span>
        <span className="font-mono text-[12px] tracking-[0.05em] text-white/60">
          {active + 1} / {images.length}
        </span>
      </div>
    </div>
  );
}
