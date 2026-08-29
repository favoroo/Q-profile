import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLightbox } from './LightboxProvider';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock';
import { VideoContent } from './VideoContent';
import { FrameContent } from './FrameContent';
import { DocContent } from './DocContent';
import { DOCS } from '../../data';
import { Icon } from '../ui/icons';
import './modal.css';

const panelSize: Record<string, string> = {
  video: 'w-[min(1280px,96vw)] max-h-[94vh]',
  frame: 'w-[95vw] h-[92vh] max-sm:w-[100dvw] max-sm:h-[100dvh] max-sm:rounded-none',
  doc: 'w-[min(860px,94vw)] h-[max(560px,88vh)] max-sm:w-[96vw] max-sm:h-[92vh]',
};

/**
 * 通用 Lightbox 弹窗：视频（多标签）/ iframe / 文档 三种模式。
 * Escape、遮罩点击关闭；打开时锁定页面滚动。
 */
export function LightboxModal() {
  const { state, close } = useLightbox();
  const open = state !== null;
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
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
              type="button"
              aria-label="关闭弹窗"
              onClick={close}
              className="absolute top-3 right-3 z-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full border-none bg-white/85 text-ink backdrop-blur-xl transition-all duration-300 hover:scale-[1.08] hover:text-accent"
            >
              <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            {state.mode === 'video' && <VideoContent videoKey={state.payload.videoKey} />}
            {state.mode === 'frame' && (
              <FrameContent src={state.payload.src} title={state.payload.title} />
            )}
            {state.mode === 'doc' && (
              <DocContent doc={DOCS[state.payload.docKey as keyof typeof DOCS]} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
