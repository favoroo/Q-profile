import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLightbox } from './LightboxProvider';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock';
import { VideoContent } from './VideoContent';
import { FrameContent } from './FrameContent';
import { DocContent } from './DocContent';
import { GalleryContent } from './GalleryContent';
import { DOCS } from '../../data';
import { Icon } from '../ui/icons';
import './modal.css';

const panelSize: Record<string, string> = {
  video: 'w-[min(1280px,96vw)] max-h-[94vh]',
  frame: 'w-[95vw] h-[92vh] max-sm:w-[100dvw] max-sm:h-[100dvh] max-sm:rounded-none',
  doc: 'w-[min(860px,94vw)] h-[max(560px,88vh)] max-sm:w-[96vw] max-sm:h-[92vh]',
  gallery: 'w-[min(1180px,96vw)] max-sm:w-[100dvw] max-sm:rounded-none',
};

/** 弹窗内可获取焦点的元素（用于 Tab 焦点循环） */
const FOCUSABLE =
  'a[href], button:not([disabled]), iframe, video[controls], [tabindex]:not([tabindex="-1"])';

/**
 * 通用 Lightbox 弹窗：视频（多标签）/ iframe / 文档 三种模式。
 * Escape、遮罩点击关闭；打开时焦点移入并锁定 Tab 循环，关闭后还原焦点。
 */
export function LightboxModal() {
  const { state, close } = useLightbox();
  const open = state !== null;
  useBodyScrollLock(open);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  /* 打开前的焦点，关闭时还原 */
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      /* 简单焦点陷阱：Tab / Shift+Tab 在弹窗内循环 */
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && dialog.contains(active);
      if (e.shiftKey) {
        if (active === first || !inside) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !inside) {
        e.preventDefault();
        first.focus();
      }
    };
    /* iframe 内容的按键落在它自己的 document 里，上面的 keydown 收不到，
       Esc 就会在读者点进正文之后失效。导出页在页内没有浮层时把 Esc 转递过来。 */
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { type?: string } | null)?.type === 'evkit-share:escape') close();
    };

    document.addEventListener('keydown', onKey);
    window.addEventListener('message', onMessage);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('message', onMessage);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [open, close]);

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="内容预览"
          ref={dialogRef}
          className="fixed inset-0 z-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* 遮罩 */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[14px]"
            onClick={close}
            aria-hidden="true"
          />
          {/* 面板 */}
          <motion.div
            className={`absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.12)] ${panelSize[state.mode]}`}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              ref={closeBtnRef}
              type="button"
              aria-label="关闭弹窗"
              onClick={close}
              className="absolute top-3 right-3 z-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full border-none bg-white/85 text-ink backdrop-blur-xl transition-all duration-300 hover:scale-[1.08] hover:text-accent"
            >
              <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            {state.mode === 'video' && <VideoContent videoKey={state.payload.videoKey} />}
            {state.mode === 'frame' && (
              <FrameContent
                src={state.payload.src}
                title={state.payload.title}
                tabs={state.payload.tabs}
              />
            )}
            {state.mode === 'doc' && (
              <DocContent doc={DOCS[state.payload.docKey as keyof typeof DOCS]} />
            )}
            {state.mode === 'gallery' && (
              <GalleryContent images={state.payload.images} startIndex={state.payload.startIndex} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
