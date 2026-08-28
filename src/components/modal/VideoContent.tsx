import { useState } from 'react';
import { VIDEO_TABS } from '../../data';

/** 视频弹窗：顶部标签切换（对齐旧站 lb-tabs），切 tab 换源自动播放。 */
export function VideoContent({ videoKey }: { videoKey: string }) {
  const tabs = VIDEO_TABS[videoKey as keyof typeof VIDEO_TABS] ?? [];
  const [active, setActive] = useState(0);
  if (!tabs.length) return null;
  const current = tabs[Math.min(active, tabs.length - 1)];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-2 overflow-x-auto border-b border-black/[0.08] py-3 pr-16 pl-4">
        {tabs.map((tab, i) => (
          <button
            key={tab.src}
            type="button"
            onClick={() => setActive(i)}
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
      <div className="flex flex-1 items-center justify-center bg-black">
        <video
          key={current.src}
          src={current.src}
          controls
          autoPlay
          preload="auto"
          playsInline
          className="block max-h-[84vh] w-full outline-none"
        />
      </div>
    </div>
  );
}
