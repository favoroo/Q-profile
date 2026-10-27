import { useCallback, useEffect, useRef, useState } from 'react';
import type { FrameTab } from '../../data/types';
import { Icon } from '../ui/icons';

/** iframe 弹窗（EV Kit 在线体验）：可选顶部板块切换 + 两侧左右箭头/键盘循环切换 + spinner 加载态 + 小屏横屏提示。 */
export function FrameContent({ src, title, tabs }: { src: string; title: string; tabs?: FrameTab[] }) {
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const activeChipRef = useRef<HTMLButtonElement | null>(null);

  const tabList = tabs ?? [];
  const currentSrc = tabList.length > 0 ? tabList[Math.min(active, tabList.length - 1)].src : src;

  const handleTabChange = (index: number) => {
    if (index === active) return;
    setActive(index);
    setLoaded(false);
  };

  const go = useCallback(
    (delta: number) => {
      if (tabList.length < 2) return;
      const next = (active + delta + tabList.length) % tabList.length;
      if (next === active) return;
      setActive(next);
      setLoaded(false);
    },
    [active, tabList.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go]);

  /* 箭头/键盘切换后，把高亮 chip 滚回可视区（chips 行窄屏下可横向滚动） */
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [active]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tabList.length > 1 && (
        <div className="flex flex-none gap-2 overflow-x-auto border-b border-black/[0.08] py-3 pr-16 pl-4">
          {tabList.map((tab, i) => (
            <button
              key={tab.src}
              ref={i === active ? activeChipRef : undefined}
              type="button"
              onClick={() => handleTabChange(i)}
              aria-pressed={i === active}
              className={`flex-none cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
                i === active
                  ? 'bg-accent text-white'
                  : 'bg-transparent text-ink-2 border-black/[0.08] hover:text-accent hover:border-accent'
              }`}
              style={i === active ? { borderColor: 'var(--color-accent)' } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <div className="hidden border-b border-black/[0.08] bg-white px-4 py-1.5 text-[12px] text-ink-3 max-sm:block">
        小屏幕设备建议旋转横屏，或在桌面端体验完整交互
      </div>
      <div className="relative min-h-0 flex-1 bg-bg-alt">
        {!loaded && (
          <div className="absolute inset-0 z-2 flex flex-col items-center justify-center gap-3 bg-bg-alt text-[13.5px] text-ink-3 transition-opacity duration-300">
            <span className="lb-spinner" />
            <span>正在加载体验页面…</span>
          </div>
        )}
        {/* 故意不加 sandbox：分享文档的站内图片灯箱靠 <dialog>.showModal()，
            一旦加上 sandbox 就必须额外开 allow-modals，否则静默失效。 */}
        <iframe
          src={currentSrc}
          title={title}
          allow="clipboard-write"
          onLoad={() => setLoaded(true)}
          className="block h-full w-full border-none"
        />
        {tabList.length > 1 && (
          <>
            <button
              type="button"
              aria-label="上一板块"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 z-3 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-none bg-white/85 text-ink shadow-[0_4px_14px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.08] hover:text-accent active:scale-95"
            >
              <Icon name="chevron" className="h-4 w-4 rotate-180" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="下一板块"
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 z-3 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-none bg-white/85 text-ink shadow-[0_4px_14px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.08] hover:text-accent active:scale-95"
            >
              <Icon name="chevron" className="h-4 w-4" strokeWidth={2} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
