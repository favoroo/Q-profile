import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { contact } from '../../data';
import { Icon } from '../ui/icons';
import { Reveal } from '../motion/Reveal';

export function Contact() {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

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

  return (
    <section className="bg-black pt-[60px] pb-[72px] text-[#F5F5F7]" id="contact">
      <div className="mx-auto w-[min(1080px,calc(100%-48px))]">
        <Reveal className="mb-9 text-center">
          <p className="mb-2 font-mono text-[12.5px] font-semibold tracking-[0.22em] text-accent uppercase">
            {contact.eyebrow}
          </p>
          <h2 className="m-0 text-[clamp(28px,4vw,44px)] leading-[1.1] font-bold tracking-[-0.02em] text-white">
            {contact.title}
          </h2>
          <p className="mx-auto mt-2.5 max-w-[560px] text-[15px] leading-[1.65] text-[rgba(245,245,247,0.62)]">
            {contact.description}
          </p>
        </Reveal>

        <Reveal>
          <div className="mx-auto max-w-[480px]">
            <div className="rounded-[28px] border border-white/[0.1] bg-white/[0.07] p-8 backdrop-blur-2xl max-md:p-6">
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
