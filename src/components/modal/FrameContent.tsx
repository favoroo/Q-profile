import { useState } from 'react';

/** iframe 弹窗（EV Kit 2 在线体验）：spinner 加载态 + 小屏横屏提示。 */
export function FrameContent({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
        <iframe
          src={src}
          title={title}
          allow="clipboard-write"
          onLoad={() => setLoaded(true)}
          className="block h-full w-full border-none"
        />
      </div>
    </div>
  );
}
