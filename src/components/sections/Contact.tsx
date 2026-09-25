import { useState, useRef, lazy, Suspense } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { contact } from '../../data';
import { Icon } from '../ui/icons';
import { Reveal } from '../motion/Reveal';

const CarSceneBackground = lazy(() => import('../3d/CarSceneBackground'));

export function Contact() {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  /* 3D 场景（5.6MB GLB + 1.8MB HDR + three chunk）临近视口才挂载，
     once: true —— 挂载过一次后保持挂载，避免反复下载闪烁 */
  const sectionRef = useRef<HTMLElement | null>(null);
  const sceneNearby = useInView(sectionRef, { once: true, margin: '600px 0px 600px 0px' });

  const handleCopy = async (text: string, notice?: string) => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch {
      // Fallback
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setToast(notice || `已复制到剪贴板：${text}`);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 2800);
    }
  };

  // 移动端底部留白加大：卡片下方给 3D 车模留出完整展示区，页面也能继续下滑。
  // 桌面端内容顶对齐（lg:justify-start），让左侧标题块与右上角 "NEVER IDLE"
  // 标语形成同高度视觉对齐；移动端保持垂直居中。
  return (
    <section ref={sectionRef} className="relative bg-black pt-[84px] pb-[96px] max-md:pb-[340px] lg:justify-start lg:pt-[76px] text-[#F5F5F7] overflow-hidden min-h-[640px] flex flex-col justify-center" id="contact">
      {/* 3D 车模全景背景 (React Bits ModelViewer)：临近视口才挂载，卸载首屏的
          GLB/HDR/three 全家桶下载与 WebGL 上下文创建 */}
      {sceneNearby && (
        <Suspense fallback={null}>
          <CarSceneBackground showSlogan={true} slogan={contact.slogan} />
        </Suspense>
      )}

      {/* pointer-events-none：放行鼠标到底下的 3D canvas（车模可拖拽旋转），
          需要交互的元素在内部单独开 pointer-events-auto */}
      <div className="pointer-events-none relative z-10 mx-auto w-[min(1080px,calc(100%-48px))]">
        {/* 标题区：字体风格与右侧 "NEVER IDLE" 标语呼应
            （font-black italic 展示体 + 白/蓝辉光，强度比标语收敛一档） */}
        <Reveal className="mb-10 text-center lg:text-left">
          <p
            className="mb-2 font-mono text-[12.5px] font-semibold tracking-[0.22em] text-accent uppercase"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 16px rgba(0,113,227,0.45)' }}
          >
            {contact.eyebrow}
          </p>
          <h2
            className="m-0 font-sans text-[clamp(30px,4.2vw,48px)] leading-[1.08] font-black italic tracking-[-0.02em] text-white/95 select-none"
            style={{
              textShadow:
                '0 2px 12px rgba(0,0,0,0.55), 0 0 22px rgba(255,255,255,0.35), 0 0 56px rgba(0,113,227,0.4)',
            }}
          >
            {contact.title}
          </h2>
          <p className="mx-auto lg:mx-0 mt-3 max-w-[560px] text-[15px] leading-[1.65] text-[rgba(245,245,247,0.78)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {contact.description}
          </p>
        </Reveal>

        <Reveal>
          {/* 桌面端卡片左对齐 1080px 内容栅格，避开右侧 3D 车模与红绒布台 */}
          <div className="mx-auto max-w-[480px] lg:ml-0 lg:mr-auto">
            <div className="pointer-events-auto rounded-[28px] border border-white/[0.18] bg-black/55 p-8 shadow-[0_28px_60px_rgba(0,0,0,0.65)] backdrop-blur-2xl ring-1 ring-white/10 max-md:p-6 transition-all hover:border-white/[0.28]">
              <div className="flex flex-col gap-[20px]">
                {contact.rows.map((row) => (
                  <div key={row.label} className="flex items-center gap-4">
                    <span className="grid h-[44px] w-[44px] flex-none place-items-center rounded-xl bg-white/[0.1] text-white">
                      <Icon name={row.icon} />
                    </span>
                    <div>
                      <div className="text-[12px] tracking-[0.06em] text-[rgba(245,245,247,0.55)]">
                        {row.label}
                      </div>
                      <div className="mt-0.5 text-[15.5px] font-semibold text-white">
                        {row.href ? (
                          <a
                            href={row.href}
                            className="text-white no-underline transition-colors hover:text-accent hover:underline"
                          >
                            {row.value}
                          </a>
                        ) : row.copyValue ? (
                          <button
                            type="button"
                            aria-label={`复制${row.label}`}
                            onClick={() => handleCopy(row.copyValue!, row.copyNotice)}
                            className="text-left text-white transition-colors hover:text-accent cursor-pointer"
                          >
                            {row.value}
                          </button>
                        ) : (
                          row.value
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* 复制成功浮动 Toast 气泡 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-8 left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/20 bg-[#1c1c1e]/95 px-5 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          >
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/20 text-[12px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
              ✓
            </span>
            <span className="text-[13.5px] font-medium text-white/95 truncate">
              {toast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
