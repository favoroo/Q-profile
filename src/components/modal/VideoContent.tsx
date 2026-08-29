import { useState, useRef } from 'react';
import { VIDEO_TABS } from '../../data';

/** 视频弹窗：顶部标签切换（对齐旧站 lb-tabs），切 tab 换源自动播放。 */
export function VideoContent({ videoKey }: { videoKey: string }) {
  const tabs = VIDEO_TABS[videoKey as keyof typeof VIDEO_TABS] ?? [];
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!tabs.length) return null;
  const current = tabs[Math.min(active, tabs.length - 1)];

  const handleTabChange = (index: number) => {
    if (index === active) return;
    setActive(index);
    setLoading(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none gap-2 overflow-x-auto border-b border-black/[0.08] py-3 pr-16 pl-4">
        {tabs.map((tab, i) => (
          <button
            key={tab.src}
            type="button"
            onClick={() => handleTabChange(i)}
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
      <div className="relative flex aspect-video w-full flex-1 items-center justify-center overflow-hidden bg-black">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black text-[13.5px] text-white/75 transition-opacity duration-300">
            <span className="lb-spinner-dark" />
            <span className="font-medium tracking-wide">正在加载视频…</span>
          </div>
        )}
        <video
          ref={videoRef}
          key={current.src}
          src={current.src}
          controls
          autoPlay
          preload="auto"
          playsInline
          onLoadStart={() => setLoading(true)}
          onLoadedData={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onPlaying={() => setLoading(false)}
          onWaiting={() => setLoading(true)}
          className="block h-full w-full object-contain outline-none"
        />
      </div>
    </div>
  );
}
